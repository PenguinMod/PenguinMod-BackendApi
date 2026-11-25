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
    app.get("/api/v1/projects/getremixes", async (req, res) => {
        const packet = req.query;

        const projectID = String(packet.projectID);
        const page = utils.handle_page(packet.page);

        if (!projectID) {
            return res.status(400).json({ error: "Missing projectID" });
        }

        const projects = await utils.UserManager.getRemixes(
            projectID,
            page,
            Number(process.env.PageSize),
        );

        return res.send(projects);
    });
};
