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
    app.get("/api/v1/users/customization/getCustomization", utils.cors(), async (req, res) => {
        const packet = req.query;

        const target = String(packet.target).toLowerCase();

        if (!target) {
            utils.error(res, 400, "Missing target");
            return;
        }

        const exists = await utils.UserManager.existsByUsername(target, false);
        if (!exists) {
            utils.error(res, 404, "User does not exist");
            return;
        }

        const badges = await utils.UserManager.getBadges(target);
        if (!badges.includes("donator")) {
            utils.error(res, 400, "NotDonator");
            return;
        }

        // if disabled just return default {}
        if (await utils.UserManager.getUserCustomizationDisabled(target)) {
            res.status(200);
            res.header("Content-Type", "application/json");
            return res.send({ customization: {} });
        }

        const customization = await utils.UserManager.getUserCustomization(target);
        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ customization });
    })
}
