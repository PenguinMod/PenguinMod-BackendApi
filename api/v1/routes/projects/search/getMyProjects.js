module.exports = (app, utils) => {
    app.get('/api/v1/projects/getmyprojects', async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const page = Number(packet.page) || 0;

        const authorID = await utils.UserManager.getIDByUsername(username);

        const projects = await utils.UserManager.getProjectsByAuthor(authorID, page, Number(utils.env.PageSize), true);

        res.status(200);
        res.header("Content-Type", 'application/json');
        return res.send(projects);
    });
}