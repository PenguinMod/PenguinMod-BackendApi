const UserManager = require("../../../../db/UserManager");

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
    app.post('/api/v1/projects/deletemodmessage', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const messageID = packet.messageID;

        if (!token || typeof messageID !== "string") {
            return utils.error(res, 400, "Missing token, target, or message");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        utils.logs.sendAdminLog(
            {
                action: `Mod message has been deleted`,
                content: `${username} deleted mod message ${messageID}`,
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },
                    {
                        name: "Message Content",
                        value: (await utils.UserManager.getMessage(messageID)).message
                    }
                ]
            }
        );

        await utils.UserManager.deleteMessage(messageID);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}