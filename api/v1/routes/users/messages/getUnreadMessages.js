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

        const token = packet.token;

        const page = utils.handle_page(packet.page);

        if (!token) {
            return utils.error(res, 400, "Missing token");
        }

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;
        const id = login.id;

        const messages = await utils.UserManager.getUnreadMessages(id, page, Number(utils.env.PageSize));

        res.header('Content-type', "application/json");
        res.send({ messages: messages });
    });
}