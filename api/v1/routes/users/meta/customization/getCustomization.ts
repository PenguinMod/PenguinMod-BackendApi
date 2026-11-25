/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/customization/getCustomization",
        utils.requireAuth(utils.UserManager, { require_supporter: true }),
        async (req, res) => {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            if (!target) {
                res.status(400).json({ error: "Missing target" });
                return;
            }

            const exists = await utils.UserManager.existsByUsername(
                target,
                false,
            );
            if (!exists) {
                res.status(404).json({ error: "User does not exist" });
                return;
            }

            const badges = await utils.UserManager.getBadges(target);
            if (!badges.includes("donator")) {
                res.status(400).json({ error: "NotDonator" });
                return;
            }

            // if disabled just return default {}
            if (await utils.UserManager.getUserCustomizationDisabled(target)) {
                res.status(200);
                res.header("Content-Type", "application/json");
                return res.send({ customization: "{}" });
            }

            const customization =
                await utils.UserManager.getUserCustomization(target);
            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ customization });
        },
    );
};
