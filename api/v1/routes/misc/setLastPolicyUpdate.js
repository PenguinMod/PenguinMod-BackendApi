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
        "/api/v1/misc/setLastPolicyUpdate",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const username = req.login.username;
            const types = packet.types;

            for (const type of types) {
                switch (type) {
                    case "privacyPolicy":
                        await utils.UserManager.setLastPrivacyPolicyUpdate();
                        break;
                    case "tos":
                        await utils.UserManager.setLastTOSUpdate();
                        break;
                    case "guidelines":
                        await utils.UserManager.setLastGuidelinesUpdate();
                        break;
                    default:
                        res.status(400).json({ error: "Invalid type" });
                        return;
                }
            }

            utils.logs.sendAdminLog(
                {
                    action: "Last policy update has been set",
                    content: `${username} set the last policy update for ${types}`,
                    fields: {
                        Admin: username,
                        Types: `\`${types}\``,
                        Date: new Date().toISOString(),
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xff33de,
            );

            res.status(200).json({ success: true });
        },
    );
};
