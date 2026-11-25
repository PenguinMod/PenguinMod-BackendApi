import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/isfollowing", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();
        const target = String(packet.target).toLowerCase();

        const agentID = await utils.UserManager.getIDByUsername(
            username,
            false,
        );
        if (!agentID) {
            res.status(404).json({ error: "AgentNotFound" });
            return;
        }

        const targetID = await utils.UserManager.getIDByUsername(target, false);
        if (!targetID) {
            res.status(404).json({ error: "TargetNotFound" });
            return;
        }

        const isFollowing = await utils.UserManager.isFollowing(
            agentID,
            targetID,
        );

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ following: isFollowing });
    });
}
