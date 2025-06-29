const UserManager = require("../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post('/api/v1/users/privateProfile', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        const privateProfile = packet.privateProfile;
        const privateToFollowing = packet.privateToFollowing;

        if (typeof privateProfile !== "boolean" || typeof privateToFollowing !== "boolean") {
            utils.error(res, 400, "InvalidBody")
            return;
        }

        await utils.UserManager.setPrivateProfile(username, privateProfile);
        await utils.UserManager.setFollowingSeeProfile(username, privateToFollowing);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}