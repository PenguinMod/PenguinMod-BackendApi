/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/setEmail",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const email = String(packet.email).toLowerCase();

            if (typeof email !== "string") {
                utils.error(res, 400, "Missing token or email");
                return;
            }

            const username = req.login.username;

            if (!utils.UserManager.validateEmail(email)) {
                utils.error(res, 400, "InvalidEmail");
                return;
            }

            if (email === req.login.email) {
                utils.error(res, 200, "ThatsTheSameEmailDingus");
                return;
            }

            if (await utils.UserManager.emailInUse(email)) {
                utils.error(res, 400, "EmailAlreadyInUse");
                return;
            }

            await utils.UserManager.setEmail(username, email);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true });
        },
    );
};
