export default (app, utils) => {
    app.post("/api/v1/reports/deleteReport", async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Reauthenticate");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 403, "Unauthorized");
        }

        const reportID = packet.reportID;

        if (!reportID) {
            return utils.error(res, 400, "Invalid request");
        }

        if (!await utils.UserManager.reportExists(reportID)) {
            return utils.error(res, 404, "Report not found");
        }

        await utils.UserManager.deleteReport(reportID);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}