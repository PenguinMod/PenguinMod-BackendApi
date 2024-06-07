export default (app, utils) => {
    app.get('/api/v1/projects/searchprojects', async (req, res) => {
        const packet = req.query;

        const query = packet.query || "";
        const page = Number(packet.page) || 0;

        const projects = await utils.UserManager.searchProjects(query, page, Number(utils.env.PageSize));

        res.status(200);
        res.header({"Content-Type": "application/json"})
        return res.send(projects);
    });
}