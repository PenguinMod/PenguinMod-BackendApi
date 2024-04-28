module.exports = (app, utils) => {
    app.post('/api/v1/reports/sendReport', async (req, res) => {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Reauthenticate");
        }

        const report = packet.report;
        const target = packet.target;
        const type = packet.type;

        if (!report || !type) {
            return utils.error(res, 400, "Invalid request");
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            return utils.error(res, 404, "Target not found");
        }

        const allowedTypes = ["user", "project"]

        if (!allowedTypes.includes(type)) {
            return utils.error(res, 400, "Invalid type");
        }

        const reporterID = await utils.UserManager.getIDByUsername(username);
        const targetID = await utils.UserManager.getIDByUsername(target);

        await utils.UserManager.report(type, targetID, report, reporterID);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}