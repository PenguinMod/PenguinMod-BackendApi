module.exports = function(app, utils) {
    app.get("/api/v1/ping", (req, res) => {
        res.send("Pong!")
    });
}