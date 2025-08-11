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
        
        if (!token || !customization || typeof(customization) !== "object") {
            utils.error(res, 400, "Missing token or customization");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        // you can change other people's customization if you are a mod
        const target = packet.target ? String(packet.target).toLowerCase() : null;
        if (target && !utils.UserManager.isModeratorOrAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }
        if (!target) {
            const badges = await utils.UserManager.getBadges(username);

            if (!badges.includes("donator")) {
                utils.error(res, 403, "MissingPermission");
                return;
            }
            if (await utils.UserManager.getUserCustomizationDisabled(username)) {
                utils.error(res, 403, "FeatureDisabledForThisAccount");
                return;
            }
        }

        const errorReason = utils.UserManager.verifyCustomData(customization);
        if (errorReason) return utils.error(res, 400, errorReason);
        await utils.UserManager.setUserCustomization(target || username, customization);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}