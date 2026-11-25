import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/", function (req, res) {
        res.redirect(process.env.HomeURL || "https://penguinmod.com/");
    });
}
