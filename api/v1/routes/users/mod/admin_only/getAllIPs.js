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
    app.get("/api/v1/users/getAllIPs", utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = String(packet.token);

        const target = String(packet.target);

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        if (!login.isAdmin) {
            return utils.error(res, 403, "Unauthorized");
        }

        if (!(await utils.UserManager.existsByUsername(target, true))) {
            return utils.error(res, 404, "User not found");
        }

        const ips = await utils.UserManager.getIPs(target);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json({ ips });
    });
};
