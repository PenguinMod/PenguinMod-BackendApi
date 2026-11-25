import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

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

            const oldBio = await utils.UserManager.getBio(target);

            await utils.UserManager.setBio(target, bio);

            utils.logs.sendAdminLog(
                {
                    action: `${target} had their bio edited`,
                    content: `${target}'s bio was edited by ${username}`,
                    fields: {
                        "Edited by": `${username}`,
                        "Old Bio": `\`\`\`\n${oldBio}\n\`\`\``,
                        "New Bio": `\`\`\`\n${bio}\n\`\`\``,
                        URL: `${process.env.HomeURL}/profile?user=${target}`,
                    },
                },
                utils.logs.pmUserAuthor(target),
                0xff0000,
            );

            res.status(200).json({ success: true });
        },
    );
}
