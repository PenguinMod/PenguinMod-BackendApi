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

            const extra_stats = {};
            if (req.login && req.login.isMod) {
                let data = utils.cache.get("stats_accountsovertime");
                if (!data) {
                    data = await utils.UserManager.getAccountsOverTime();
                }
                extra_stats.accountsOverTime = data;
            }

            res.status(200).json({ ...stats, ...extra_stats });
        },
    );
};
