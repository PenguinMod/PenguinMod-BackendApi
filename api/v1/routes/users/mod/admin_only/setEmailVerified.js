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
        "/api/v1/users/setemailverified",
        utils.cors(),
        async function (req, res) {
            const packet = req.body;

            const token = String(packet.token);

            if (!token) {
                return utils.error(res, 400, "Missing token");
            }

            const login = await utils.UserManager.loginWithToken(token);
            if (!login.success) {
                utils.error(res, 400, "Reauthenticate");
                return;
            }
            if (!login.isAdmin) {
                return utils.error(res, 401, "Unauthorized");
            }

            const user = String(packet.user);
            const value = String(packet.value) !== "false";

            if (!(await utils.UserManager.existsByUsername(user))) {
                return utils.error(res, 400, "Thats not a real user buddy");
            }

            await utils.UserManager.setEmailVerified(user, value);

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ success: true });
        },
    );
};
