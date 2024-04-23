// TODO: make this an actual thing that isnt for testing

module.exports = (app, utils) => {
    app.get('/api/v1/projects/getProjects', async (req, res) => {
        if (!utils.env.ViewingEnabled) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;

        const projects = await utils.UserManager.getProjects(packet.page, utils.env.PageSize);

        return res.send(projects);
    }
)}