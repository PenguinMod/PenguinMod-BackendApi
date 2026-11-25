import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/meta/getfollowers", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();
        const page = utils.handle_page(packet.page);

        if (
            !username ||
            !(await utils.UserManager.existsByUsername(username))
        ) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const followers = await utils.UserManager.getFollowers(
            username,
            page,
            Number(process.env.PageSize),
        );

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(followers);
    });
}
