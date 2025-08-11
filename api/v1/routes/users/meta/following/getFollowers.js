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

        const username = (String(packet.username)).toLowerCase();
        const page = utils.handle_page(packet.page);

        if (!username) {
            utils.error(res, 400, "Missing username");
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "User not found");
            return;
        }

        const followers = await utils.UserManager.getFollowers(username, page, Number(utils.env.PageSize));

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(followers);
    });
}