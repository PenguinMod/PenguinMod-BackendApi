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
    app.post(
        "/api/v1/projects/modmessage",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.body;

            const target = String(packet.target);
            const message = String(packet.message);

            const disputable = String(packet.disputable) === "true";

            const username = req.login.username;

            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                return utils.error(res, 404, "UserNotFound");
            }

            const id = await utils.UserManager.sendMessage(
                targetID,
                { type: "modMessage", message },
                disputable,
                0,
            );

            utils.logs.modMessage(username, target, id, message);

            res.status(200).json({ success: true });
        },
    );
};
