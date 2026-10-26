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
    app.post('/api/v1/users/privateFollowSettings', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = String(packet.token);

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate");
            return;
        }

        const profileHideFollowing = String(packet.profileHideFollowing) === "true";
        const profileHideFollowers = String(packet.profileHideFollowers) === "true";

        if (typeof profileHideFollowing !== "boolean" || typeof profileHideFollowers !== "boolean") {
            utils.error(res, 400, "InvalidBody");
            return;
        }

        await utils.UserManager.setProfileHideFollowing(login.username, profileHideFollowing);
        await utils.UserManager.setProfileHideFollowers(login.username, profileHideFollowers);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}