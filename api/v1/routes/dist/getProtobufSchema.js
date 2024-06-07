export default (app, utils) => {
    app.get('/api/v1/dist/protobufSchema.js', async (req, res) => {
        res.header("Content-Type", 'application/javascript');
        res.sendFile(utils.path.join(utils.homeDir, 'api/v1/db/protobufs/project.browser.proto.js'));
    });
}