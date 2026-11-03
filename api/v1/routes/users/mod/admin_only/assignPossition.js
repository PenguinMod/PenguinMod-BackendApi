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
        "/api/v1/users/assignPossition",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const admin = String(packet.admin) === "true";
            const approver = String(packet.approver) === "true";

            const username = req.login.username;

            if (!(await utils.UserManager.existsByUsername(target))) {
                utils.error(res, 400, "AccountDoesNotExist");
                return;
            }

            const isAdmin = await utils.UserManager.isAdmin(target);
            const isModerator = await utils.UserManager.isModerator(target);

            await utils.UserManager.setAdmin(target, admin);
            await utils.UserManager.setModerator(target, approver);

            const fields = [];

            if (isAdmin !== admin) {
                fields.push({
                    name: "Admin",
                    value: `${isAdmin} -> ${admin}`,
                });
            }
            if (isModerator !== approver) {
                fields.push({
                    name: "Approver",
                    value: `${isModerator} -> ${approver}`,
                });
            }

            utils.logs.sendAdminUserLog(
                username,
                target,
                "Admin or mod has updated user's permissions.",
                0x7f3ddc,
                fields,
            );

            res.status(200).json({ success: true });
        },
    );
};
