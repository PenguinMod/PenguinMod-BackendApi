/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/extrainfostatus",
        utils.requireAuth(utils.UserManager, { allow_banned: true }),
        async function (req, res) {
            const user_meta = req.login.fullMeta;

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
