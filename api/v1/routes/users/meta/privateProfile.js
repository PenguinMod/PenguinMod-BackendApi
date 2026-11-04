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
    app.post(
        "/api/v1/users/privateProfile",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const username = req.login.username;

            const privateProfile = String(packet.privateProfile) === "true";
            const privateToFollowing =
                String(packet.privateToFollowing) === "true";

            if (
                typeof privateProfile !== "boolean" ||
                typeof privateToFollowing !== "boolean"
            ) {
                utils.error(res, 400, "InvalidBody");
                return;
            }

            await utils.UserManager.setPrivateProfile(username, privateProfile);
            await utils.UserManager.setFollowingSeeProfile(
                username,
                privateToFollowing,
            );

            res.status(200).json({ success: true });
        },
    );
};
