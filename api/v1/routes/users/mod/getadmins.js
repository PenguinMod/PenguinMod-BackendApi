/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

// TODO: this probably doesn't need to be admin only

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/getadmins",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const admins = await utils.UserManager.getAllAdmins();

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ admins: admins });
        },
    );
};
