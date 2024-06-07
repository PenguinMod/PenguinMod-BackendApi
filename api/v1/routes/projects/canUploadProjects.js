export default (app, utils) => {
    app.get('/api/v1/projects/canuploadprojects', async (req, res) => {
        const canUpload = await utils.UserManager.getRuntimeConfigItem("uploadingEnabled");

        return res.send({ canUpload });
    });
}