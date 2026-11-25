const cached = {
    item: null,
    time: 0,
};

/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/getuserstats",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
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
