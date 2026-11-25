import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/isfollowing", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();
        const target = String(packet.target).toLowerCase();

        const agentData = await utils.manager.users.getUserData(username);
        if (!agentData || agentData.permBanned) {
            res.status(404).json({ error: "AgentNotFound" });
            return;
        }

        const targetData = await utils.manager.users.getUserData(target);
        if (!targetData || targetData.permBanned) {
            res.status(404).json({ error: "TargetNotFound" });
            return;
        }

        const isFollowing = await utils.manager.users.isFollowing(
            agentData.id,
            targetData.id,
        );

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ following: isFollowing });
    });
}
