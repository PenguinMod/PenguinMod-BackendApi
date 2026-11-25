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
    app.get(
        "/api/v1/users/getottcode",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const code = await utils.UserManager.genOneTimeTokenCode(
                req.login.token,
            );

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ code });
        },
    );
};
