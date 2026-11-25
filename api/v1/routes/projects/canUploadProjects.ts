import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/projects/canuploadprojects", async function (req, res) {
        const canUpload =
            await utils.UserManager.getRuntimeConfigItem("uploadingEnabled");

        res.status(200).json({ canUpload });
    });
}
