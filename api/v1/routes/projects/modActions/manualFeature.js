/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/manualfeature",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.body;

            const toggle = String(packet.toggle) === "true";
            const projectID = String(packet.projectID);
            const username = req.login.username;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return utils.error(res, 404, "Project not found");
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
                utils.logs.sendFeatureLog(
                    projectID,
                    title,
                    author.username,
                    true,
                );

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
                    fields: [
                        {
                            name: "Mod",
                            value: username,
                        },
                        {
                            name: "Project ID",
                            value: projectID,
                        },
                        {
                            name: "Status",
                            value: toggle,
                        },
                        {
                            name: "URL",
                            value: `${utils.env.StudioURL}/#${projectID}`,
                        },
                    ],
                },
                {
                    name: username,
                    icon_url: String(
                        `${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`,
                    ),
                    url: `${utils.env.HomeURL}/profile?user=${username}`,
                },
                0xe5df18,
            );

            res.status(200).json({ success: true });
        },
    );
};
