module.exports = (app, utils) => {
    app.get('/api/v1/misc/getStats', async (req, res) => {
        const stats = await utils.UserManager.getStats();
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json(stats);
    });
}