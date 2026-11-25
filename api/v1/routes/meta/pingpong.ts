import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/ping", function (req, res) {
        res.send("Pong!");
    });
}
