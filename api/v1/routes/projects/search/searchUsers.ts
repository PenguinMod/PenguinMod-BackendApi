import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { handle_page } from "../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/projects/searchusers", async function (req, res) {
        const packet = req.query;

        const query = String(packet.query || "");
        const page = handle_page(packet.page);

        const users = await utils.manager.users.searchUsers(
            query,
            page,
            Number(process.env.PageSize),
        );

        res.status(200).json(users);
    });
}
