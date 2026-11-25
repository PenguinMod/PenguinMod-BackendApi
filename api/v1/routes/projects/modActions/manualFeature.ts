import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/manualfeature",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const toggle = String(packet.toggle) === "true";
            const projectID = String(packet.projectID);
            const username = res.locals.login.username;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return res.status(404).json({ error: "Project not found" });
            }

            if (!(await utils.UserManager.isFeatured(projectID)) && toggle) {
                const metadata =
                    await utils.UserManager.getProjectMetadata(projectID);
                const author = metadata.author;
                const title = metadata.title;

                await utils.UserManager.sendMessage(
                    author.id,
                    { type: "projectFeatured" },
                    false,
                    projectID,
                );

                await utils.UserManager.featureProject(projectID, true, true);
                utils.logs.sendFeatureLog(projectID, title, author.username);

                if (
                    !(await utils.UserManager.hasBadge(
                        author.username,
                        "featured",
                    ))
                ) {
                    await utils.UserManager.addBadge(
                        author.username,
                        "featured",
                    );
                    await utils.UserManager.sendMessage(
                        author.id,
                        { type: "newBadge", badge: "featured" },
                        false,
                        projectID,
                    );
                } else {
                    if (
                        !(await utils.UserManager.hasBadge(
                            author.username,
                            "multifeature",
                        ))
                    ) {
                        await utils.UserManager.addBadge(
                            author.username,
                            "multifeature",
                        );
                        await utils.UserManager.sendMessage(
                            author.id,
                            { type: "newBadge", badge: "multifeature" },
                            false,
                            projectID,
                        );
                    }
                }
            }

            await utils.UserManager.featureProject(projectID, toggle);

            utils.logs.sendAdminLog(
                {
                    action: `Project has been manually ${toggle ? "" : "un"}featured`,
                    content: `${username} manually featured project ${projectID}`,
                    fields: {
                        Mod: username,
                        "Project ID": projectID,
                        Status: toggle,
                        URL: `${process.env.StudioURL}/#${projectID}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xe5df18,
            );

            res.status(200).json({ success: true });
        },
    );
}
