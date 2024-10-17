/api/users/login

module.exports = (app, utils) => {
    app.get('/api/users/login', async (req, res) => {
        res.status(200);
        res.text("The server is down, meaning you cannot login. Please check the status page or the discord server for more information.");
    });
}
