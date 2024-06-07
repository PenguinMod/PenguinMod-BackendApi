export default (app, utils) => {
    app.get('/api/v1/projects/getprojects', async (req, res) => {
        if (!await utils.UserManager.getRuntimeConfigItem("viewingEnabled")) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;
        const page = Number(packet.page) || 0;
        const reverse = packet.reverse || false;

        const projects = await utils.UserManager.getProjects(page, Number(utils.env.PageSize), reverse);

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        return res.send(projects);
    }
)}