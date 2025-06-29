const UserManager = require("../../../../db/UserManager");

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
    app.post("/api/v1/users/customization/setCustomization", utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;
        const customization = packet.customization;

        if (!token || typeof(customization) !== "string") {
            utils.error(res, 400, "Missing token or customization");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        const badges = await utils.UserManager.getBadges(username);

        if (!badges.includes("donator")) {
            utils.error(res, 403, "MissingPermission");
            return;
        }

        await utils.UserManager.setUserCustomization(username, customization);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}