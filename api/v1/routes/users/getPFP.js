/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/getpfp", async (req, res) => {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        const pfp = await utils.UserManager.getProfilePicture(username);

        if (!pfp) {
            return utils.error(res, 404, "UserNotFound");
        }

        res.status(200);
        res.header("Content-Type", "image/png");
        res.header("Cache-Control", "public, max-age=90");
        res.send(pfp);
    });
};
