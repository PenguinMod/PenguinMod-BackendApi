const UserManager = require("../../../../db/UserManager");

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
    app.get("/api/v1/users/meta/getfollowers", async function (req, res) {
        const packet = req.query;

        // meant for getting the data
        const target = (String(packet.target)).toLowerCase();
        const page = utils.handle_page(packet.page);

        if (!target) {
            utils.error(res, 400, "Missing username");
            return;
        }
        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "User not found");
            return;
        }

        // incase the user hides followers, check if we are the user/a mod
        const token = packet.token || "";

        const login = await utils.UserManager.loginWithToken(token);
        let username = login.username;
        let loggedIn = login.success;

        const target_data = await utils.UserManager.getUserData(target);
        const user_data = await utils.UserManager.getUserData(username);
        const isMod = loggedIn ? (user_data.moderator || user_data.admin) : false;

        // if not logged in, or we arent a mod and the current acc is not the target
        if (!loggedIn || (!isMod && (username !== target))) {
            if (target_data.privateProfile) {
                // if its a private profile, error if we arent logged in, the account doesnt let following view their profile, or we arent being followed by them
                if (!loggedIn || !target_data.allowFollowingView) {
                    res.status(403);
                    res.header("Content-Type", "application/json");
                    res.json({ "error": "PrivateProfile" });
                    return;
                }

                const usernameID = await utils.UserManager.getIDByUsername(username);
                const isFollowing = await utils.UserManager.isFollowing(target_data.id, usernameID);
                if (!isFollowing) {
                    res.status(403);
                    res.header("Content-Type", "application/json");
                    res.json({ "error": "PrivateProfile" });
                    return;
                }
            }
            if (await utils.UserManager.getProfileHideFollowers(target)) {
                res.status(403);
                res.header("Content-Type", "application/json");
                res.json({ "error": "Hidden" });
                return;
            }
        }

        const followers = await utils.UserManager.getFollowers(target, page, Number(utils.env.PageSize));

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send(followers);
    });
}