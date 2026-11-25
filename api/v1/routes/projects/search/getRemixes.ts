import type { Application } from "express";
import type { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/projects/getremixes", async function (req, res) {
        const packet = req.query;

        const projectID = String(packet.projectID);
        const page = utils.handle_page(packet.page);

        if (!projectID) {
            return res.status(400).json({ error: "Missing projectID" });
        }

        const projects = await utils.UserManager.getRemixes(
            projectID,
            page,
            Number(process.env.PageSize),
        );

        return res.send(projects);
    });
}
