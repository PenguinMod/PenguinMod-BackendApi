/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/getusername", async function (req, res) {
        const packet = req.query;

        const id = String(packet.ID);

        if (!id) {
            return utils.error(res, 400, "Missing ID");
        }

        const username = await utils.UserManager.getUsernameByID(id);

        res.status(200);
        res.header("Content-type", "text/plain");
        res.send({ username: username });
    });
};
