import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";
import {
    pmUserAuthor,
    sendAdminLog,
    sendFeatureLog,
} from "../../../../../utils/logs";
import { assertNonNull } from "../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/manualfeature",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const toggle = String(packet.toggle) === "true";
            const projectID = projectId(String(packet.projectID));
            const username = res.locals.login.username;

            const metadata =
                await utils.manager.projects.getProjectMetadata(projectID);
            if (!metadata) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            if (!metadata.featured && toggle) {
                const author = metadata.author;
                const title = metadata.title;

                await utils.manager.messages.sendMessage(
                    author.id,
                    { type: "projectFeatured" },
                    false,
                    projectID,
                );

                await utils.manager.projects.featureProject(projectID, true);
                sendFeatureLog(projectID, title, author.username);

                const authorMeta = assertNonNull(
                    await utils.manager.users.getUserDataByID(author.id),
                );
                if (!authorMeta.badges.includes("featured")) {
                    await utils.manager.users.addBadge(author.id, "featured");
                    await utils.manager.messages.sendMessage(
                        author.id,
                        { type: "newBadge", badge: "featured" },
                        false,
                        projectID,
                    );
                } else {
                    if (!authorMeta.badges.includes("multifeature")) {
                        await utils.manager.users.addBadge(
                            author.id,
                            "multifeature",
                        );
                        await utils.manager.messages.sendMessage(
                            author.id,
                            { type: "newBadge", badge: "multifeature" },
                            false,
                            projectID,
                        );
                    }
                }
            }

            await utils.manager.projects.featureProject(projectID, toggle);

            sendAdminLog(
                {
                    action: `Project has been manually ${toggle ? "" : "un"}featured`,
                    content: `${username} manually featured project ${projectID}`,
                    fields: {
                        Mod: username,
                        "Project ID": projectID,
                        Status: String(toggle),
                        URL: `${process.env.StudioURL}/#${projectID}`,
                    },
                },
                pmUserAuthor(username),
                0xe5df18,
            );

            res.status(200).json({ success: true });
        },
    );
}
