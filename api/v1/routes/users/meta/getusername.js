/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

// TODO: this endpoint can probably be killed

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/getusername", async function (req, res) {
        const packet = req.query;

        const username = await utils.UserManager.getUsernameByID(
            String(packet.ID),
            false,
        );
        if (!username) {
            return utils.error(res, 404, "UserNotFound");
        }

        res.status(200);
        res.header("Content-type", "text/plain");
        res.send({ username: username });
    });
};
