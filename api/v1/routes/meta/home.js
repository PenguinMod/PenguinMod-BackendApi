module.exports = function(app, options) {
    app.get("/", (req, res) => {
        res.redirect("https://penguinmod.com");
    });
}