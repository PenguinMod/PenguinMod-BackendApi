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
    app.get("/api/v1/users/meta/getfollowercount", async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();

        if (!username) {
            utils.error(res, 400, "Missing username");
            return;
        }

        const count = await utils.UserManager.getFollowerCount(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ count: count });
    });
}