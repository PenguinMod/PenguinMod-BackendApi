import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { handle_page } from "../../../../../../utils/misc";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/meta/getfollowers", async function (req, res) {
        const packet = req.query;

        const username = makeUsername(String(packet.username));
        const page = handle_page(packet.page);

        const userData = await utils.manager.users.getUserData(username);
        if (!userData || userData.permBanned) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const followers = await utils.manager.users.getFollowers(
            userData.id,
            page,
            Number(process.env.PageSize),
        );

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(followers);
    });
}
