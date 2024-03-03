const path = require('path');

module.exports = function(app, options) {
    app.get("/api/v1/", (req, res) => {
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.sendFile(path.join(options.homeDir, './metadata.json'));
    });
}