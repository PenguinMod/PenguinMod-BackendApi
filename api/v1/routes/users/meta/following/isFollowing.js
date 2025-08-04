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
    app.get("/api/v1/users/isfollowing", async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const target = (String(packet.target)).toLowerCase();

        // check that these accs exist
        if (!username || !target) {
            utils.error(res, 400, "Missing username or target");
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound");
            return;
        }
        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "NotFound");
            return;
        }

        // incase the users have some privacy setting, check if we are a mod
        const token = packet.token || "";
        const login = await utils.UserManager.loginWithToken(token);
        let fetcherUsername = login.username;
        let loggedIn = login.success;

        // get all of the data for this req
        const target_data = await utils.UserManager.getUserData(target);
        const user_data = await utils.UserManager.getUserData(username);
        const fetcher_data = await utils.UserManager.getUserData(fetcherUsername);
        const fetcherIsMod = loggedIn ? (fetcher_data.moderator || fetcher_data.admin) : false;

        const usernameID = await utils.UserManager.getIDByUsername(username);
        const targetID = await utils.UserManager.getIDByUsername(target);
        const fetcherID = loggedIn ? await utils.UserManager.getIDByUsername(fetcherUsername) : null;

        // if not logged in, or we arent a mod
        if (!loggedIn || !fetcherIsMod) {
            // this is a bit complicated:
            // we need to see if the user has a private profile/if we can see that profile. if we can, we need to be able to see who they are following.
            // we need to see if the target has a private profile/if we can see that profile. if we can, we need to be able to see their followers.
            // see if user is private
            if (user_data.privateProfile) {
                if (!loggedIn || !user_data.allowFollowingView) {
                    res.status(403);
                    res.header("Content-Type", "application/json");
                    res.json({ "error": "PrivateProfile" });
                    return;
                }
                // people the user follows can see the user's profile
                const isFollowing = await utils.UserManager.isFollowing(usernameID, fetcherID);
                if (!isFollowing) {
                    res.status(403);
                    res.header("Content-Type", "application/json");
                    res.json({ "error": "PrivateProfile" });
                    return;
                }
            }
            // see if user hides their following
            if (await utils.UserManager.getProfileHideFollowing(username)) {
                res.status(403);
                res.header("Content-Type", "application/json");
                res.json({ "error": "Hidden" });
                return;
            }
            // see if target is private
            if (target_data.privateProfile) {
                if (!loggedIn || !target_data.allowFollowingView) {
                    res.status(403);
                    res.header("Content-Type", "application/json");
                    res.json({ "error": "PrivateProfile" });
                    return;
                }
                // people the target follows can see the target's profile
                const isFollowing = await utils.UserManager.isFollowing(targetID, fetcherID);
                if (!isFollowing) {
                    res.status(403);
                    res.header("Content-Type", "application/json");
                    res.json({ "error": "PrivateProfile" });
                    return;
                }
            }
            // see if target hides their followers
            if (await utils.UserManager.getProfileHideFollowers(target)) {
                res.status(403);
                res.header("Content-Type", "application/json");
                res.json({ "error": "Hidden" });
                return;
            }
        }

        // user doesnt hide who they follow, and target doesnt hide their followers
        const isFollowing = await utils.UserManager.isFollowing(usernameID, targetID);
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ following: isFollowing });
    });
}