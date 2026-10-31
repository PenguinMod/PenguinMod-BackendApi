/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/getmessagecount",
        utils.requireAuth(utils.UserManager, { allow_banned: true }),
        async (req, res) => {
            const count = await utils.UserManager.getMessageCount(req.login.id);

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ count: count });
        },
    );
};
