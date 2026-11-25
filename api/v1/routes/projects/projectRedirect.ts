import { Application } from "express";
import { readFileSync } from "fs";
import path from "path";
import { Utils } from "../../../../index";
import { projectId } from "../../db/new-types";
import { escapeXML } from "../../../../utils/misc";
import { ExtProjectData } from "../../db/types";

export default function (app: Application, utils: Utils): void {
    const projectTemplate = readFileSync(
        path.join(__dirname, "../../../../static/project.html"),
    ).toString();
    app.get("/:id", async function (req, res) {
        const json = await utils.manager.projects.getProjectMetadata(
            projectId(String(req.params.id)),
        );

        if (!json || !json.public || json.softRejected || json.hardReject) {
            return res.status(404).json({ error: "ProjectNotFound" });
        }

        let html = projectTemplate;
        for (const prop in json) {
            // high intelligence programming
            const value =
                prop === "username"
                    ? json.author.username
                    : String(json[prop as keyof ExtProjectData]);

            html = html.replaceAll(`{project.${prop}}`, escapeXML(value));
            html = html.replaceAll(
                `{studio_url}`,
                String(process.env.StudioURL),
            );
            html = html.replaceAll(`{api_url}`, String(process.env.ApiURL));
        }
        res.status(200);
        res.send(html);
    });
}
