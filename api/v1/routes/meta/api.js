const path = require('path');

module.exports = function(app, utils) {
    app.get("/api/v1/", (req, res) => {
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.sendFile(path.join(utils.homeDir, './metadata.json'));
    });
}