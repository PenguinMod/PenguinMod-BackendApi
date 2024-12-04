module.exports = (app, utils) => {
    app.get('/api/v1/projects/getrandomproject', async (req, res) => {
        const project = await utils.UserManager.getRandomProjects(1);

        res.status(200);
        res.header("Content-Type", 'application/json');
        return res.send(project.length > 0 ? project[0] : {});
    });
}