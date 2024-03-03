module.exports = function(app, options) {
    app.get("/api/v1/ping", (req, res) => {
        res.send("Pong!")
    });
}