module.exports = (app, utils) => {
    app.get('/api/v1/projects/getprojectsbyauthor', async (req, res) => {
        const packet = req.query;

        const authorUsername = String(packet.authorUsername).toLowerCase();
        const page = utils.handle_page(packet.page);

        if (!authorUsername) {
            return utils.error(res, 400, "Missing author username");
        }

        if (!await utils.UserManager.existsByUsername(authorUsername)) {
            return utils.error(res, 404, "UserNotFound")
        }

        const id = await utils.UserManager.getIDByUsername(authorUsername);

        const projects = (await utils.UserManager.getProjectsByAuthor(id, page, Number(utils.env.PageSize)))
        .map(project => {
            project.author = {
                username: authorUsername,
                id: id
            }

            return project;
        });

        return res.send(projects);
    });
}
