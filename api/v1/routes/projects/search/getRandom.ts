import type { Application } from "express";
import type { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/projects/getrandomproject", async function (req, res) {
        const packet = req.query;

        const n = Math.min(Number(packet.n || 1), Number(process.env.PageSize));

        const projects = await utils.UserManager.getRandomProjects(n);

        res.status(200).json(projects);
    });
}
