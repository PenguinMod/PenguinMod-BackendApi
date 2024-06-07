import fs from 'fs';
import path from 'path';
import child_process from 'child_process';

export default function(app, utils) {
    app.get("/api/v1/", (req, res) => {
        // read the json file
        const metadata = JSON.parse(fs.readFileSync(path.join(utils.homeDir, './metadata.json'), 'utf8'));

        child_process.exec('git rev-parse HEAD', function(err, stdout) {
            metadata.version.git = stdout.trim();

            res.status(200);
            res.header("Content-Type", 'application/json');
            res.json(metadata);
        });
    });
}