module.exports = (app, utils) => {
    app.get('/api/v1/projects/getremixes', async (req, res) => {
        const packet = req.query;

        const projectID = packet.projectID;
        const page = packet.page || 0;

        if (!projectID) {
            return utils.error(res, 400, "Missing authorId");
        }

        const projects = await utils.UserManager.getRemixes(projectID, page, Number(utils.env.PageSize));

        return res.send(projects);
    });
}