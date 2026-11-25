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
    app.post(
        "/api/v1/users/customization/setCustomization",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const customization = String(packet.customization);

            if (!customization) {
                res.status(400).json({ error: "Missing customization" });
                return;
            }

            const username = req.login.username;
            const isMod = req.login.isMod;

            if (!isMod && !req.login.isDonator) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            // you can change other people's customization if you are a mod
            const target = packet.target
                ? String(packet.target).toLowerCase()
                : null;
            if (target && !isMod) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            if (!target) {
                if (
                    await utils.UserManager.getUserCustomizationDisabled(
                        username,
                    )
                ) {
                    res.status(403).json({
                        error: "FeatureDisabledForThisAccount",
                    });
                    return;
                }
            }

            const errorReason =
                utils.UserManager.verifyCustomizationJson(customization);
            if (errorReason) {
                return res.status(400).json({ error: errorReason });
            }
            await utils.UserManager.setUserCustomization(
                target || username,
                customization,
            );

            res.status(200).json({ success: true });
        },
    );
};
