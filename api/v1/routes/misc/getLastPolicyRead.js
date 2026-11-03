/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/misc/getLastPolicyRead",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const lastPolicyRead = {
                privacyPolicy: req.login.fullMeta.lastPrivacyPolicyRead,
                TOS: req.login.fullMeta.lastTOSRead,
                guidelines: req.login.fullMeta.lastGuidelinesRead,
            };

            res.status(200).json(lastPolicyRead);
        },
    );
};
