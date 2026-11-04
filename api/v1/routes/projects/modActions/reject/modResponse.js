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
        "/api/v1/projects/modresponse",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.body;

            const disputeID = String(packet.disputeID);
            const message = String(packet.message);

            const username = req.login.username;

            const dispute = await utils.UserManager.getMessage(disputeID);

            if (!dispute) {
                return utils.error(res, 404, "MessageNotFound");
            }

            const id = await utils.UserManager.sendMessage(
                dispute.receiver,
                { type: "disputeResponse", message },
                true,
                dispute.projectID,
            );

            const disputer = await utils.UserManager.getUsernameByID(
                dispute.receiver,
            );

            utils.logs.modResponse(
                username,
                disputer,
                id,
                dispute.dispute,
                message,
            );

            res.status(200).json({ success: true });
        },
    );
};
