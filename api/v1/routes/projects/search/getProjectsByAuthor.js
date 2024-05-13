module.exports = (app, utils) => {
    app.get('/api/v1/projects/getprojectsbyauthor', async (req, res) => {
        const packet = req.query;

        const authorUsername = packet.authorUsername;
        const page = Number(packet.page) || 0;

        if (!authorUsername) {
            return utils.error(res, 400, "Missing authorId");
        }

        const projects = await utils.UserManager.getProjectsByAuthor(authorUsername, page, Number(utils.env.PageSize));

        return res.send(projects);
    });
}