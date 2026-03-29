const UserManager = require("../../../../db/UserManager");

const cached = {
    item: null,
    time: 0,
};

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
    app.get(
        "/api/v1/users/getuserstats",
        utils.cors(),
        async function (req, res) {
            const packet = req.query;

            const token = packet.token;

            if (!token) {
                return utils.error(res, 400, "Missing token");
            }

            const login = await utils.UserManager.loginWithToken(token);
            if (!login.success) {
                utils.error(res, 400, "Reauthenticate");
                return;
            }
            const username = login.username;

            if (!(await utils.UserManager.isAdmin(username))) {
                return utils.error(res, 401, "Unauthorized");
            }

            const hour = 1000 * 60 * 60;
            const day = hour * 24;
            if (cached.time + day >= Date.now()) {
                res.status(200);
                res.header("Content-type", "application/json");
                res.send({ stats: cached.item });
                return;
            }

            const stats = await utils.UserManager.getUserStats();

            cached.item = stats;
            cached.time = Date.now();

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ stats });
        },
    );
};
