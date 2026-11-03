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
    app.post(
        "/api/v1/users/setemailverified",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const user = String(packet.user);
            const value = String(packet.value) !== "false";

            if (!user || !(await utils.UserManager.existsByUsername(user))) {
                return utils.error(res, 400, "Thats not a real user buddy");
            }

            await utils.UserManager.setEmailVerified(user, value);

            res.status(200).json({ success: true });
        },
    );
};
