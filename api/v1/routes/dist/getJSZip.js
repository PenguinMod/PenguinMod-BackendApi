export default (app, utils) => {
    app.get('/api/v1/dist/jszip.js', async (req, res) => {
        res.header("Content-Type", 'application/javascript');
        res.sendFile(utils.path.join(utils.homeDir, 'dist/jszip.min.js'));
    });
}