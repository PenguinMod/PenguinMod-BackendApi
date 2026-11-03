/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/isfollowing", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();
        const target = String(packet.target).toLowerCase();

        const agentID = await utils.UserManager.getIDByUsername(
            username,
            false,
        );
        if (!agentID) {
            utils.error(res, 404, "AgentNotFound");
            return;
        }

        const targetID = await utils.UserManager.getIDByUsername(target, false);
        if (!targetID) {
            utils.error(res, 404, "TargetNotFound");
            return;
        }

        const isFollowing = await utils.UserManager.isFollowing(
            agentID,
            targetID,
        );

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ following: isFollowing });
    });
};
