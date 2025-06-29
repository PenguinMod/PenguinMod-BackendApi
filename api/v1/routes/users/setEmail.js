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

        const token = packet.token;

        const email = packet.email;

        const validateEmail = (email) => {
            return email.match(
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
        };

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

        if (!validateEmail(email)) {
            utils.error(res, 400, "InvalidEmail");
            return;
        }

        if (await utils.UserManager.emailInUse(email)) {
            utils.error(res, 400, "EmailAlreadyInUse");
            return;
        }

        await utils.UserManager.setEmail(username, email);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}