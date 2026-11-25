import { Application } from "express";
import { Utils } from "../../../../index";
import path from "node:path";

export default function (app: Application, utils: Utils): void {
    app.get("/robots.txt", (req, res) => {
        res.sendFile(path.join(__dirname, "../../../../robots.txt"));
    });
}
