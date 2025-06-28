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
    app.post('/api/v1/misc/setLastPolicyUpdate', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Forbidden")
            return;
        }

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
                    utils.error(res, 400, "Invalid type")
                    return;
            }
        }

        utils.logs.sendAdminLog(
            {
                action: "Last policy update has been set",
                content: `${username} set the last policy update for ${types}`,
                fields: [
                    {
                        name: "Admin",
                        value: username
                    },
                    {
                        name: "Types",
                        value: `\`${types}\``
                    },
                    {
                        name: "Date",
                        value: new Date().toISOString()
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xff33de
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ success: true });
    });
}