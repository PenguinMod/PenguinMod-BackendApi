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
        "/api/v1/users/getmods",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const mods = await utils.UserManager.getAllModerators();

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ mods: mods });
        },
    );
};
