const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

module.exports = function(app, utils) {
    app.get("/api/v1/", (req, res) => {
        // read the json file
        const metadata = JSON.parse(fs.readFileSync(path.join(utils.homeDir, './metadata.json'), 'utf8'));

        child_process.exec('git rev-parse HEAD', function(err, stdout) {
            fs.writeFileSync(path.join(utils.homeDir, './metadata.txt'), "HELLOOOO????");
            metadata.version.git = stdout.trim();

            res.status(200);
            res.header("Content-Type", 'application/json');
            res.json(metadata);
        });
    });
}