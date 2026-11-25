/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/misc/getStats",
        utils.maybeAuth(utils.UserManager),
        async (req, res) => {
            const stats = await utils.UserManager.getStats();

            if (req.login && req.login.isMod) {
                // TODO: allow to get arbitrary months back
                stats.accountsOverTime =
                    await utils.UserManager.getAccountsOverTime(12);
            }

            res.status(200).json(stats);
        },
    );
};
