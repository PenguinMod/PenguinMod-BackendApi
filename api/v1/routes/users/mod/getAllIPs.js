export default (app, utils) => {
    app.get("/api/v1/users/getAllIPs", async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = packet.target;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Reauthenticate");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 403, "Unauthorized");
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            return utils.error(res, 404, "User not found");
        }

        const ips = await utils.UserManager.getIPs(target);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ ips });
    });
}