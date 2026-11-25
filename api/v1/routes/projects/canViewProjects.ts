import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/projects/canviewprojects", async function (req, res) {
        const viewing =
            await utils.UserManager.getRuntimeConfigItem("viewingEnabled");

        res.status(200).json({ viewing: viewing });
    });
}
