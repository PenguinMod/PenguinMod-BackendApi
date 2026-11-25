import type { Application } from "express";
import type { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/gettokenfromonetimecode", async function (req, res) {
        const packet = req.query;

        const code = String(packet.code);

        const token = await utils.UserManager.exchangeCodeForToken(code);

        if (!token) {
            return res.status(404).json({ error: "UnknownCode" });
        }

        const username = (await utils.UserManager.loginWithToken(token, true))
            .username;

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ token, username });
    });
}
