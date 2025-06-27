const UserManager = require("../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post('/api/v1/misc/setProfanityList', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(null, token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;
        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount")
            return;
        }

        const words = packet.json;

        if (typeof words !== 'object') {
            utils.error(res, 400, "Invalid Words");
            return;
        }

        const types = ["illegalWords", "illegalWebsites", "spacedOutWordsOnly", "potentiallyUnsafeWords", "potentiallyUnsafeWordsSpacedOut", "legalExtensions"];
        for (const key in words) {
            // make sure its an array of strings
            if (typeof words[key] !== 'object') {
                utils.error(res, 400, "Invalid inner words object");
                return;
            }
            for (const word of words[key]) {
                if (typeof word !== 'string') {
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
            const newDiff = words[key].filter(x => !old[key].includes(x));
            const oldDiff = old[key].filter(x => !words[key].includes(x));

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
                        value: username
                    },
                    {
                        name: "Difference",
                        value: diff
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0x3ddc5b
        );
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}