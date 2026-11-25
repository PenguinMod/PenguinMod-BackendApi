/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/putonwatchlist",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const enabled = String(packet.enabled) === "true";

            const username = req.login.username;

            await utils.UserManager.toggleWatchlist(target, enabled);

            utils.logs.watchlist.putOnWatchlist(target, username);

            res.status(200).json({ success: true });
        },
    );
};
