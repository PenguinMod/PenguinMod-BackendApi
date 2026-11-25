/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
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
                return res.status(404).json({ error: "MessageNotFound" });
            }

            if (!message.disputable) {
                return res.status(400).json({ error: "NotDisputable" });
            }

            if (!message.receiver === userID) {
                return res.status(401).json({ error: "ThatsNotYoursBuddy" });
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
