/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/getid", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        if (!username) {
            return res.status(400).json({ error: "Missing username" });
        }

        const id = await utils.UserManager.getIDByUsername(username, false);

        if (!id) {
            return res.status(404).json({ error: "UserNotFound" });
        }

        res.status(200);
        res.header("Content-type", "application/json");
        res.send({ id: id });
    });
};
