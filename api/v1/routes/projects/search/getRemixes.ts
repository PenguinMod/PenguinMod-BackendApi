import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { projectId } from "../../../db/new-types";
import { handle_page } from "../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/projects/getremixes", async function (req, res) {
        const packet = req.query;

        const projectID = projectId(String(packet.projectID));
        const page = handle_page(packet.page);

        const projects = await utils.manager.projects.getRemixes(
            projectID,
            page,
            Number(process.env.PageSize),
        );

        return res.send(projects);
    });
}
