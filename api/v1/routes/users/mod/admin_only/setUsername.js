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
        "/api/v1/users/changeusernameadmin",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const newUsername = String(packet.newUsername).toLowerCase();

            const username = req.login.username;

            if (await utils.UserManager.existsByUsername(newUsername, true)) {
                utils.error(res, 400, "UsernameInUse");
                return;
            }

            await utils.UserManager.changeUsername(target, newUsername);

            utils.logs.sendAdminUserLog(
                username,
                newUsername,
                `Admin or mod has updated user's username.`,
                0xf47420,
                [
                    {
                        name: "Old Username",
                        value: target,
                    },
                    {
                        name: "New Username",
                        value: newUsername,
                    },
                ],
            );

            res.status(200).json({ success: true });
        },
    );
};
