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
    app.get("/api/v1/users/userexists", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        const exists = await utils.UserManager.existsByUsername(username);

        res.status(200);
        res.header("Content-type", "application/json");
        res.send({ exists });
    });
};
