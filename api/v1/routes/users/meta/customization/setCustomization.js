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
                utils.error(res, 400, "Missing customization");
                return;
            }

            const username = req.login.username;
            const isMod = req.login.isMod;

            if (!isMod && !req.login.isDonator) {
                return utils.error(res, 401, "Unauthorized");
            }

            // you can change other people's customization if you are a mod
            const target = packet.target
                ? String(packet.target).toLowerCase()
                : null;
            if (target && !isMod) {
                return utils.error(res, 401, "Invalid credentials");
            }
            if (!target) {
                if (
                    await utils.UserManager.getUserCustomizationDisabled(
                        username,
                    )
                ) {
                    utils.error(res, 403, "FeatureDisabledForThisAccount");
                    return;
                }
            }

            const errorReason =
                utils.UserManager.verifyCustomizationJson(customization);
            if (errorReason) {
                return utils.error(res, 400, errorReason);
            }
            await utils.UserManager.setUserCustomization(
                target || username,
                customization,
            );

            res.status(200).json({ success: true });
        },
    );
};
