module.exports = (app, utils) => {
    app.get('/api/v1/projects/searchprojects', async (req, res) => {
        const packet = req.query;

        const query = packet.query || "";
        const page = utils.handle_page(packet.page);
        const type = packet.type || "";
        const reverse = packet.reverse || false;

        const username = packet.username;
        const token = packet.token;

        const is_mod = username && token && await utils.UserManager.loginWithToken(username, token) && await utils.UserManager.isModeratorOrAdmin(username);

        const projects = await utils.UserManager.searchProjects(is_mod, query, type, page, Number(utils.env.PageSize), reverse);

        res.status(200);
        res.header({"Content-Type": "application/json"})
        return res.send(projects);
    });
}