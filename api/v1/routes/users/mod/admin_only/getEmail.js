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
        "/api/v1/users/getemail",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const email = await utils.UserManager.getEmail(target);

            if (!email) {
                return utils.error(res, 404, "UserNotFound");
            }

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ email });
        },
    );
};
