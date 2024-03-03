const path = require('path');

module.exports = function(app, options) {
    app.get("/api/v1/robots.txt", (req, res) => {
        res.sendFile(path.join(options.homeDir, "/robots.txt"));
    });
}