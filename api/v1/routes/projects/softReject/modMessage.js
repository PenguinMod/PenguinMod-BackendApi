module.exports = (app, utils) => {
    app.post('/api/v1/users/modresponse', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const disputeID = packet.disputeID;
        const message = packet.message;

        if (!username || !token || typeof disputeID !== "number" || typeof message !== "string") {
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

        await utils.UserManager.sendMessage(dispute.receiver, message, true, dispute.projectID);

        // TODO: send log

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}