export default (app, utils) => {
    app.get('/api/v1/dist/pbf.js', async (req, res) => {
        res.header("Content-Type", 'application/javascript');
        res.sendFile(utils.path.join(utils.homeDir, 'dist/pbf.js'));
    });
}