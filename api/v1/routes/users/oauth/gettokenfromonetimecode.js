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
    app.get("/api/v1/users/gettokenfromonetimecode", async function (req, res) {
        const packet = req.query;

        const code = String(packet.code);

        const token = await utils.UserManager.exchangeCodeForToken(code);

        if (!token) {
            return utils.error(res, 404, "UnknownCode");
        }

        const username = (await utils.UserManager.loginWithToken(token, true))
            .username;

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ token, username });
    });
};
