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
    app.post("/api/v1/users/customization/setCustomizationDisabled", utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const target = String(packet.target).toLowerCase();
        const isEnabled = packet.toggle;

        if (!token || typeof isEnabled !== "boolean") {
            return utils.error(res, 400, "Missing token, or toggle");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isModeratorOrAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        await utils.UserManager.setUserCustomizationDisabled(target, !isEnabled);

        utils.logs.sendAdminUserLog(username, target, "Admin has updated user's ability to customize their profile.", 0x8c03fc, [
            {
                name: "Is Enabled?",
                value: String(isEnabled)
            }
        ]);

        res.status(200);
        res.header("Content-Type", "application/json");
        return res.send({ success: true });
    });
}