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
    app.get('/api/v1/users/getunreadmessages', utils.cors(), async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const page = utils.handle_page(packet.page);

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const messages = await utils.UserManager.getUnreadMessages(id, page, Number(utils.env.PageSize));

        res.header('Content-type', "application/json");
        res.send({ messages: messages });
    });
}