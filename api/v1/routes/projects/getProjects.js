module.exports = (app, utils) => {
    app.get('/api/v1/projects/getprojects', async (req, res) => {
        if (!await utils.UserManager.getRuntimeConfigItem("viewingEnabled")) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;
        const page = utils.handle_page(packet.page);
        const reverse = packet.reverse || false;

        // TODO: temporary fix. PLEASE fix soon.
        const projects = await utils.UserManager.getProjects(false, page, Number(utils.env.PageSize), Number(utils.env.MaxPageSize), reverse);

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        return res.send(projects);
    }
)}