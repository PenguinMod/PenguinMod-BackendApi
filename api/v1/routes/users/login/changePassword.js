const UserManager = require("../../../db/UserManager");

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
    app.post("/api/v1/users/changePassword", utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;
        if (typeof token !== "string") {
            utils.error(res, 400, "Missing token");
            return;
        }

        const old_password = packet.old_password;
        const new_password = packet.new_password;
        if (!old_password || !new_password) {
            utils.error(res, 400, "Missing old_password or new_password");
            return;
        }
        if (typeof old_password !== "string" && typeof new_password !== "string") {
            utils.error(res, 400, "Missing old_password or new_password");
            return;
        }
        const passwordDoesNotMeetLength = new_password.length < 8 || new_password.length > 50;
        const passwordMeetsTextInclude = new_password.match(/[a-z]/) && new_password.match(/[A-Z]/);
        const passwordMeetsSpecialInclude = new_password.match(/[0-9]/) && new_password.match(/[^a-z0-9]/i);
        if (passwordDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthPassword");
            return;
        }
        if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
            utils.error(res, 400, "MissingRequirementsPassword");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        const username = login.username;
        if (!await utils.UserManager.loginWithPassword(username, old_password)) {
            utils.error(res, 401, "Invalid Login");
            return;
        }

        await utils.UserManager.changePassword(username, new_password);

        const newToken = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIP(username, req.realIP);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json({ "token": newToken });
    });
}