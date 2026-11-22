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
        "/api/v1/users/getmessagethread",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const message = String(req.params.messageID);

            console.log(req.params);

            const thread = await utils.UserManager.getMessageThread(message);

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ thread });
        },
    );
};
