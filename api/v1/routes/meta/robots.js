const path = require('path');

module.exports = function(app, utils) {
    app.get("/api/v1/robots.txt", (req, res) => {
        res.sendFile(path.join(utils.homeDir, "/robots.txt"));
    });
}