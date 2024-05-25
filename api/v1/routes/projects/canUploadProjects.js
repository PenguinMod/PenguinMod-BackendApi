module.exports = (app, utils) => {
    app.get('/api/v1/projects/canuploadprojects', async (req, res) => {
        const canUpload = utils.env.UploadingEnabled 

        return res.send({ canUpload });
    });
}