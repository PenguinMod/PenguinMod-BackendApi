/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/deletemodmessage",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.body;

            const messageID = String(packet.messageID);

            const username = req.login.username;

            utils.logs.sendAdminLog({
                action: `Mod message has been deleted`,
                content: `${username} deleted mod message ${messageID}`,
                fields: [
                    {
                        name: "Mod",
                        value: username,
                    },
                    {
                        name: "Message Content",
                        value: (await utils.UserManager.getMessage(messageID))
                            .message,
                    },
                ],
            });

            await utils.UserManager.deleteMessage(messageID);

            res.status(200).json({ success: true });
        },
    );
};
