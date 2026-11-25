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
    app.post(
        "/api/v1/users/setEmail",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const email = String(packet.email).toLowerCase();

            const username = req.login.username;

            if (!utils.UserManager.validateEmail(email)) {
                res.status(400).json({ error: "InvalidEmail" });
                return;
            }

            if (email === req.login.email) {
                res.status(200).json({ error: "ThatsTheSameEmailDingus" });
                return;
            }

            if (await utils.UserManager.emailInUse(email)) {
                res.status(400).json({ error: "EmailAlreadyInUse" });
                return;
            }

            await utils.UserManager.setEmail(username, email);

            res.status(200).json({ success: true });
        },
    );
};
