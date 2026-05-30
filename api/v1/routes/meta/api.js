const fs = require("fs");
const path = require("path");

module.exports = function (app, utils) {
    app.get("/api/v1/", (req, res) => {
        // read the json file
        const metadata = JSON.parse(
            fs.readFileSync(
                path.join(utils.homeDir, "./metadata.json"),
                "utf8",
            ),
        );

        metadata.version.git = utils.env.GIT_VERSION ?? "Unknown";

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json(metadata);
    });
};
