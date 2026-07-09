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
    app.get("/api/v1/users/scratchusergetcode", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        const exists = utils.UserManager.isValidScratchUsername(username)
            ? await utils.UserManager.scratchUserExists(username)
            : false;

        const code = exists
            ? // "inspiration" taken from ScratchOAuth2
              `Copy this paragraph (including both the code and this message). Only post this code if it came from ${utils.env.HomeURL} | ${utils.UserManager.makeASuperAwesomeState()}`
            : null;

        if (exists) {
            await utils.UserManager.registerOAuth2CustomState(code);
        }

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json({ exists, code });
    });
};
