import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/misc/getProfanityList",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const illegalWords = await utils.manager.misc.getIllegalWords();

            res.status(200).json(illegalWords);
        },
    );
}
