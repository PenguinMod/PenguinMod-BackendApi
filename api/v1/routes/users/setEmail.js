const UserManager = require("../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post("/api/v1/users/setEmail", utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = String(packet.token);

        const email = String(packet.email);

        if (!token || typeof email !== "string") {
            utils.error(res, 400, "Missing token or email");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!(await utils.UserManager.validateEmail(email))) {
            utils.error(res, 400, "InvalidEmail");
            return;
        }

        if (email == login.email) {
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
    });
};
