module.exports = (app, utils) => {
    app.get('/api/v1/projects/searchprojects', async (req, res) => {
        const packet = req.query;

        const query = packet.query;
        const page = packet.page || 0;

        if (!packet.query) {
            return utils.error(res, 400, "Missing query");
        }

        const projects = await utils.UserManager.searchProjects(query, page, Number(utils.env.PageSize));

        return res.send(projects);
    });
}