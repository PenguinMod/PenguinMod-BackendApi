import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setBio",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const bio = String(packet.bio);

            const username = res.locals.login.username;

            if (bio.length > 2048) {
                res.status(400).json({ error: "BioTooLong" });
                return;
            }

            if (
                await utils.manager.misc.illegalWordingError(bio, "bio", {
                    username,
                    id: res.locals.login.id,
                })
            ) {
                return res.status(400).json({ error: "IllegalWordsUsed" });
            }

            await utils.manager.misc.maybeIllegalWordingError(bio, "bio", {
                username,
                id: res.locals.login.id,
            });

            await utils.manager.users.setBio(username, bio);

            res.status(200).json({ success: true });
        },
    );
}
