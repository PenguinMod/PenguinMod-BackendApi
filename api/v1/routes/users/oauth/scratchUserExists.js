const UserManager = require("../../../db/UserManager");

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
    app.get("/api/v1/users/scratchuserexists", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        const exists = utils.UserManager.isValidScratchUsername(username)
            ? await utils.UserManager.scratchUserExists(username)
            : false;

        const code = exists
            ? await utils.UserManager.generateScratchCode()
            : null;

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json({ exists, code });
    });
};
