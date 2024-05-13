module.exports = (app, utils) => {
    app.get("/api/v1/reports/getReports", async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Reauthenticate");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 403, "Unauthorized");
        }

        const type = packet.type;
        const page = Number(packet.page) || 0;

        const reports = type ?
                        await utils.UserManager.getReportsByType(type, page, Number(utils.env.PageSize)) :
                        await utils.UserManager.getReports(page, Number(utils.env.PageSize));
        
        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ reports: reports });
    });
}