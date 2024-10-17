//api/users/login

module.exports = (app, utils) => {
    app.get('/api/users/login', async (req, res) => {
        res.status(403);
        res.send("The server is down, meaning you cannot login. Please check the status page or the discord server for more information.");
    });
}
