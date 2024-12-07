module.exports = (app, utils) => {
    app.get('/api/v1/projects/canviewprojects', async (req, res) => {
        const viewing = await utils.UserManager.getRuntimeConfigItem("viewingEnabled");

        return res.send({ viewing: viewing });
    });
}
