// TODO: make this an actual thing that isnt for testing

module.exports = (app, utils) => {
    app.get('/api/v1/projects/getProjects', async (req, res) => {
        const packet = req.query;

        const projects = await utils.UserManager.getProjects(0, 20);

        return res.send(projects);
    }
)}