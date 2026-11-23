const fs = require("fs");
const path = require("path");
const metadata = require("../../../../static/metadata.json");
metadata.version.git = process.env.GIT_COMMIT ?? "Unknown";

module.exports = function (app, utils) {
    app.get("/api/v1/", (req, res) => {
        res.status(200).json(metadata);
    });
};
