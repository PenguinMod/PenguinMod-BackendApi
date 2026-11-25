import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/misc/getLastPolicyUpdate", async function (req, res) {
        const lastPolicyUpdate = await utils.manager.misc.getLastPolicyUpdate();

        res.status(200).json(lastPolicyUpdate);
    });
}
