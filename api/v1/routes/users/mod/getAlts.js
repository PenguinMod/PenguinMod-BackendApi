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
    app.get(
        "/api/v1/users/getAlts",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                utils.error(res, 404, "NotFound");
                return;
            }

            const alts = await utils.UserManager.getAlts(targetID);
            const usernames = await utils.UserManager.idListToUsernames(alts);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ alts: usernames });
        },
    );
};
