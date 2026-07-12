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
    app.get(
        "/api/v1/users/extrainfostatus",
        utils.cors(),
        async function (req, res) {
            const packet = req.query;

            const token = String(packet.token);

            const login = await utils.UserManager.loginWithToken(
                token,
                true,
                true,
            );
            if (!login.success) {
                utils.error(res, 400, "Reauthenticate");
                return;
            }
            const user_meta = login.fullMeta;

            const birthdayEntered = user_meta.birthdayEntered;
            const countryEntered = user_meta.countryEntered;
            const isEmailVerified = user_meta.emailVerified;

            const user = {
                birthdayEntered,
                countryEntered,
                isEmailVerified,
            };

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send(user);
        },
    );
};
