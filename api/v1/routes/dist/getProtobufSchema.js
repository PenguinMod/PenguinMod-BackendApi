module.exports = (app, utils) => {
    app.get('/api/v1/dist/protobufSchema.js', async (req, res) => {
        res.sendFile(utils.path.join(utils.homeDir, 'api/v1/db/protobufs/project.browser.proto.js'));
    });
}