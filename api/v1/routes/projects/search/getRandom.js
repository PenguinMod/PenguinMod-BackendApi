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
    app.get("/api/v1/projects/getrandomproject", async (req, res) => {
        const packet = req.query;

        const n = Math.min(Number(packet.n || 1), utils.env.PageSize);

        const projects = await utils.UserManager.getRandomProjects(n);

        res.status(200);
        res.header("Content-Type", "application/json");
        return res.send(projects);
    });
};
