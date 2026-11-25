import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setbioadmin",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const bio = String(packet.bio);

            const username = res.locals.login.username;

            if (bio.length > 2048) {
                res.status(400).json({
                    error: "BioLengthMustBeLessThan2048Chars",
                });
                return;
            }

            const userData = await utils.manager.users.getUserData(target);
            if (!userData) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            await utils.manager.users.setBio(target, bio);

            sendAdminLog(
                {
                    action: `${target} had their bio edited`,
                    content: `${target}'s bio was edited by ${username}`,
                    fields: {
                        "Edited by": `${username}`,
                        "Old Bio": `\`\`\`\n${userData.bio}\n\`\`\``,
                        "New Bio": `\`\`\`\n${bio}\n\`\`\``,
                        URL: `${process.env.HomeURL}/profile?user=${target}`,
                    },
                },
                pmUserAuthor(target),
                0xff0000,
            );

            res.status(200).json({ success: true });
        },
    );
}
