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
        "/api/v1/users/removeoauthmethod",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            // get the method
            const packet = req.body;

            const method = String(packet.method);

            const id = req.login.id;
            const hasPassword = !!req.login.fullMeta.password;

            const methods = await utils.UserManager.getOAuthMethods(id);

            if (!methods.includes(method)) {
                utils.error(res, 404, "MethodNotConnected");
                return;
            }

            if (methods.length === 1 && !hasPassword) {
                return utils.error(
                    res,
                    400,
                    "You would get locked out of your account",
                );
            }

            await utils.UserManager.removeOAuthMethod(id, method);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true });
        },
    );
};
