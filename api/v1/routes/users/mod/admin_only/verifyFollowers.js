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
        "/api/v1/users/verifyfollowers",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target);

            const success = await utils.UserManager.verifyFollowers(target);

            if (!success) {
                return utils.error(res, 404, "UserNotFound");
            }

            res.status(200).json({ success: true });
        },
    );
};
