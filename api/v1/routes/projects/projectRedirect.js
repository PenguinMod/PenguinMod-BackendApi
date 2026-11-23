const fs = require("fs");
const path = require("path");

/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    const projectTemplate = fs
        .readFileSync(path.join(utils.homeDir, "static/project.html"))
        .toString();
    app.get("/:id", async function (req, res) {
        const json = await utils.UserManager.getProjectMetadata(
            String(req.params.id),
        );

        if (!json) {
            return res.status(404).json({ error: "Not Found" });
        }

        if (!json.public || json.softRejected || json.hardReject) {
            return res.status(404).json({ error: "Not Found" });
        }

        let html = projectTemplate;
        json.author = json.author.username;
        for (const prop in json) {
            html = html.replaceAll(
                `{project.${prop}}`,
                utils.escapeXML(json[prop]),
            );
            html = html.replaceAll(`{studio_url}`, process.env.StudioURL);
            html = html.replaceAll(`{api_url}`, process.env.ApiURL);
        }
        res.status(200);
        res.send(html);
    });
};
