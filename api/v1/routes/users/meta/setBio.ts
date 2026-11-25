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

            const userID = res.locals.login.id;

            let trigger = await utils.UserManager.checkForIllegalWording(bio);
            if (trigger) {
                res.status(400).json({ error: "IllegalWordsUsed" });

                const illegalWordIndex =
                    await utils.UserManager.getIndexOfIllegalWording(bio);

                const before = bio.substring(0, illegalWordIndex[0]);
                const after = bio.substring(illegalWordIndex[1], bio.length);
                const illegalWord = bio.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                utils.logs.sendHeatLog(
                    before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    "profileBio",
                    [username, userID],
                );

                return;
            }

            trigger =
                await utils.UserManager.checkForPotentiallyIllegalWording(bio);
            if (trigger) {
                const illegalWordIndex =
                    await utils.UserManager.getIndexOfPotentiallyIllegalWording(
                        bio,
                    );

                const before = bio.substring(0, illegalWordIndex[0]);
                const after = bio.substring(illegalWordIndex[1], bio.length);
                const illegalWord = bio.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                utils.logs.sendHeatLog(
                    before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    "profileBio",
                    [username, userID],
                    0xffbb00,
                );
            }

            await utils.UserManager.setBio(username, bio);

            res.status(200).json({ success: true });
        },
    );
}
