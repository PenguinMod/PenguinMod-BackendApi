/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/markmessageasread",
        utils.requireAuth(utils.UserManager, { allow_banned: true }),
        async (req, res) => {
            const packet = req.body;

            const messageID = String(packet.messageID);

            if (!(await utils.UserManager.messageExists(messageID))) {
                return utils.error(res, 400, "Invalid message ID");
            }

            // TODO: verify user is recipient of message

            await utils.UserManager.markMessageAsRead(messageID, true);

            res.status(200).json({ success: true });
        },
    );
};
