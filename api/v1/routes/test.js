module.exports = (app) => {
    app.get("/api/v1/test", (req, res) => {
        res.send("Hello World!");
    });
}