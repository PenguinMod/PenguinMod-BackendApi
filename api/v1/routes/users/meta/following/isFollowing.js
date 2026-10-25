/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/isfollowing", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username || "").toLowerCase();
        const target = String(packet.target || "").toLowerCase();

        const token = String(packet.token);
        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate");
            return;
        }

        // check that these accs exist
        if (!username || !target) {
            utils.error(res, 400, "Missing username or target");
            return;
        }

        if (!(await utils.UserManager.existsByUsername(username))) {
            utils.error(res, 404, "NotFound");
            return;
        }

        if (!(await utils.UserManager.existsByUsername(target))) {
            utils.error(res, 404, "NotFound");
            return;
        }

        // get all of the data for this req
        const fetcher_data = await utils.UserManager.getUserData(login.username);
        const fetcherIsMod = fetcher_data.moderator || fetcher_data.admin;

        const target_data = await utils.UserManager.getUserData(target);
        const user_data = await utils.UserManager.getUserData(username);

        const usernameID = await utils.UserManager.getIDByUsername(username);
        const targetID = await utils.UserManager.getIDByUsername(target);

        // if we arent a mod and fetcher isnt the source user then respect follower and following rules
        if (!fetcherIsMod && !(login.id === usernameID) && (target_data.profileHideFollowers || user_data.profileHideFollowing)) {
            res.status(403);
            res.header("Content-Type", "application/json");
            res.json({ "error": "Hidden" });
            return;
        }

        // user doesnt hide who they follow, and target doesnt hide their followers
        const isFollowing = await utils.UserManager.isFollowing(
            usernameID,
            targetID,
        );

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ following: isFollowing });
    });
};
