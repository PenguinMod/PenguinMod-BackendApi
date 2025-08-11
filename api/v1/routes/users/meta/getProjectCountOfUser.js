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
    app.post("/api/v1/users/getprojectcountofuser", utils.cors(), async (req, res) => {
        const packet = req.body;

        const target = String(packet.target).toLowerCase();

        if (!target) {
            utils.error(res, 400, "Missing target");
            return;
        }

        const exists = await utils.UserManager.existsByUsername(target, false);
        if (!exists) {
            utils.error(res, 404, "User does not exist");
            return;
        }

        const id = await utils.UserManager.getIDByUsername(target);

        const count = await utils.UserManager.getProjectCountOfUser(id);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ count });
    })
}
