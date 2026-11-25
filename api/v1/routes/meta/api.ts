import { Response, Request, Application } from "express";
import type { Utils } from "../../../../index";
import metadata from "../../../../static/metadata.json";
metadata.version.git = process.env.GIT_COMMIT ?? "Unknown";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/", function (req: Request, res: Response) {
        res.status(200).json(metadata);
    });
}
