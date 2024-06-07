export default (app, utils) => {
    app.post('/api/v1/projects/modresponse', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const disputeID = packet.disputeID;
        const message = packet.message;

        if (!username || !token || typeof disputeID !== "string" || typeof message !== "string") {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const dispute = await utils.UserManager.getMessage(disputeID);

        if (!dispute) {
            return utils.error(res, 404, "MessageNotFound");
        }

        const id = await utils.UserManager.sendMessage(dispute.receiver, {type: "disputeResponse", message}, true, dispute.projectID);

        const disputer = await utils.UserManager.getUsernameByID(dispute.receiver);

        utils.logs.modResponse(username, disputer, id, dispute.dispute, message);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}