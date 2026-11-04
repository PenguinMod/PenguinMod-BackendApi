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
    app.post("/api/v1/users/getprojectcountofuser", async (req, res) => {
        const packet = req.body;

        const target = String(packet.target).toLowerCase();

        const id = await utils.UserManager.getIDByUsername(target, false);
        if (!id) {
            utils.error(res, 404, "TargetNotFound");
            return;
        }

        const count = await utils.UserManager.getProjectCountOfUser(id);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ count });
    });
};
