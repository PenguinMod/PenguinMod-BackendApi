/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/getAllAccountsWithIP",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target);

            const users = await utils.UserManager.getAllAccountsWithIP(target);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ users });
        },
    );
};
