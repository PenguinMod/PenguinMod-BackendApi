/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

// TODO: maybe require mod for this

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/isBanned", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        if (typeof username !== "string") {
            res.status(400).json({ error: "InvalidRequest" });
            return;
        }

        const isBanned = await utils.UserManager.isBanned(username);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json({ isBanned: isBanned });
    });
};
