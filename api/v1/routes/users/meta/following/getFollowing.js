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
    app.get("/api/v1/users/meta/getfollowing", async function (req, res) {
        const packet = req.query;

        // meant for getting the data
        const target = String(packet.target).toLowerCase();
        const page = utils.handle_page(packet.page);

        const token = String(packet.token);
        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate");
            return;
        }

        if (!target) {
            utils.error(res, 400, "Missing username");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "User not found");
            return;
        }

        // incase the user hides followers, check if we are the user/a mod
        const fetcher_data = await utils.UserManager.getUserData(login.username);
        const fetcherIsMod = fetcher_data.moderator || fetcher_data.admin;

        const target_data = await utils.UserManager.getUserData(target);

        // if we arent a mod and fetcher isnt the source user then respect following rules
        if (!fetcherIsMod && !(login.id === target_data.id) && target_data.profileHideFollowing) {
            res.status(403);
            res.header("Content-Type", "application/json");
            res.json({ "error": "Hidden" });
            return;
        }

        const following = await utils.UserManager.getFollowing(
            target,
            page,
            Number(utils.env.PageSize),
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send(following);
    });
}