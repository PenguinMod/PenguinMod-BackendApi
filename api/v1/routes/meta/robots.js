import path from 'path';

export default function(app, utils) {
    app.get("/api/v1/robots.txt", (req, res) => {
        res.sendFile(path.join(utils.homeDir, "/robots.txt"));
    });
}