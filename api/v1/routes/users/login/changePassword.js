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
        "/api/v1/users/changePassword",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const old_password = String(packet.old_password);
            const new_password = String(packet.new_password);
            if (!old_password || !new_password) {
                utils.error(res, 400, "Missing old_password or new_password");
                return;
            }
            if (
                typeof old_password !== "string" &&
                typeof new_password !== "string"
            ) {
                utils.error(res, 400, "Missing old_password or new_password");
                return;
            }
            const passwordDoesNotMeetLength =
                new_password.length < 8 || new_password.length > 50;
            const passwordMeetsTextInclude =
                new_password.match(/[a-z]/) && new_password.match(/[A-Z]/);
            const passwordMeetsSpecialInclude =
                new_password.match(/[0-9]/) && new_password.match(/[^a-z0-9]/i);
            if (passwordDoesNotMeetLength) {
                utils.error(res, 400, "InvalidLengthPassword");
                return;
            }
            if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
                utils.error(res, 400, "MissingRequirementsPassword");
                return;
            }

            const username = req.login.username;
            if (
                !(await utils.UserManager.loginWithPassword(
                    username,
                    old_password,
                ))
            ) {
                utils.error(res, 401, "Invalid Login");
                return;
            }

            const newToken = await utils.UserManager.changePassword(
                username,
                new_password,
            );

            await utils.UserManager.addIP(username, req.realIP);

            res.status(200).json({ token: newToken });
        },
    );
};
