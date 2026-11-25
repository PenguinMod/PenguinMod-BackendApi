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
    app.get(
        "/api/v1/misc/getProfanityList",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const illegalWords = await utils.UserManager.getIllegalWords();

            res.status(200).json(illegalWords);
        },
    );
};
