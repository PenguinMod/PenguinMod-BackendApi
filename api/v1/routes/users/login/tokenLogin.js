/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

// TODO: we should probably get rid of this endpoint.
// It's more useful if the frontend just fetches a load of data and stores it,
// then can use that instead of making multiple requests

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/tokenlogin",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            res.status(200).json({ success: true });
        },
    );
};
