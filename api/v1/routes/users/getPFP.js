const UserManager = require("../../db/UserManager");

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
    app.get("/api/v1/users/getpfp", async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        const pfp = await utils.UserManager.getProfilePicture(username);

        res.status(200);
        res.header("Content-Type", "image/png");
        res.header("Cache-Control", "public, max-age=90");
        res.send(pfp);
    });
}