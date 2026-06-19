module.exports = function (app, utils) {
    app.get("/", (req, res) => {
        res.redirect(utils.env.HomeURL);
    });
};
