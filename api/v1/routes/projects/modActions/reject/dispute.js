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
        "/api/v1/projects/dispute",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const messageID = String(packet.messageID);
            const dispute = String(packet.dispute);

            const username = req.login.username;
            const userID = req.login.id;

            const message = await utils.UserManager.getMessage(messageID);

            if (!message) {
                return utils.error(res, 404, "MessageNotFound");
            }

            if (!message.disputable) {
                return utils.error(res, 400, "NotDisputable");
            }

            if (!message.receiver === userID) {
                return utils.error(res, 401, "ThatsNotYoursBuddy");
            }

            await utils.UserManager.dispute(messageID, dispute);

            utils.logs.disputeLog(
                username,
                messageID,
                message.message,
                dispute,
                message.projectID,
            );

            res.status(200).json({ success: true });
        },
    );
};
