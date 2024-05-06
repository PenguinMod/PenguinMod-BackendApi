module.exports = (app, utils) => {
    app.get('/api/v1/projects/getprojects', async (req, res) => {
        if (!utils.env.ViewingEnabled) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;
        const page = packet.page || 0;

        const projects = await utils.UserManager.getProjects(page, Number(utils.env.PageSize));

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        return res.send(projects);
    }
)}