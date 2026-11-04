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
    app.get("/api/v1/projects/getrandomproject", async (req, res) => {
        const packet = req.query;

        const n = Math.min(Number(packet.n || 1), Number(utils.env.PageSize));

        const projects = await utils.UserManager.getRandomProjects(n);

        res.status(200).json(projects);
    });
};
