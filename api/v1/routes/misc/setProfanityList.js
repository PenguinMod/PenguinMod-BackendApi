/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/misc/setProfanityList",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const username = req.login.username;

            const words = packet.json;

            if (typeof words !== "object") {
                utils.error(res, 400, "Invalid Words");
                return;
            }

            const types = [
                "illegalWords",
                "illegalWebsites",
                "spacedOutWordsOnly",
                "potentiallyUnsafeWords",
                "potentiallyUnsafeWordsSpacedOut",
                "legalExtensions",
                "unsafeUsernames",
                "potentiallyUnsafeUsernames",
            ];
            for (const key in words) {
                // make sure its an array of strings
                if (typeof words[key] !== "object") {
                    utils.error(res, 400, "Invalid inner words object");
                    return;
                }
                for (const word of words[key]) {
                    if (typeof word !== "string") {
                        utils.error(res, 400, "Invalid word");
                        return;
                    }
                }

                if (!types.includes(key)) {
                    utils.error(res, 400, "Invalid key");
                    return;
                }
            }

            let diff = "```diff\n";
            const old = await utils.UserManager.getIllegalWords();
            for (const key in words) {
                const newDiff = words[key].filter((x) => !old[key].includes(x));
                const oldDiff = old[key].filter((x) => !words[key].includes(x));

                if (newDiff.length < 1 && oldDiff.length < 1) {
                    continue;
                }

                diff += `### ${key} ###\n`;

                for (const word of newDiff) {
                    diff += `+ ${word}\n`;
                }
                for (const word of oldDiff) {
                    diff += `- ${word}\n`;
                }
            }
            diff += "```";

            for (const key in words) {
                await utils.UserManager.setIllegalWords(key, words[key]);
            }

            utils.logs.sendAdminLog(
                {
                    action: "Profanity list has been set",
                    content: `${username} set the profanity list`,
                    fields: [
                        {
                            name: "Admin",
                            value: username,
                        },
                        {
                            name: "Difference",
                            value: diff,
                        },
                    ],
                },
                {
                    name: username,
                    icon_url: String(
                        `${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`,
                    ),
                    url: `${utils.env.HomeURL}/profile?user=${username}`,
                },
                0x3ddc5b,
            );

            res.status(200).json({ success: true });
        },
    );
};
