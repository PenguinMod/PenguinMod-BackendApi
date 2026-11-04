/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/hardreject",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.body;

            const project = String(packet.project);
            const message = String(packet.message);

            const username = req.login.username;

            // TODO: multiple DB queries being made, only 1 needed
            if (
                !project ||
                !(await utils.UserManager.projectExists(project, true))
            ) {
                return utils.error(res, 404, "ProjectNotFound");
            }

            if (await utils.UserManager.isHardRejected(project)) {
                return utils.error(res, 400, "AlreadyHardRejected");
            }

            await utils.UserManager.hardRejectProject(project);

            const projectData =
                await utils.UserManager.getProjectMetadata(project);

            await utils.UserManager.removeEvilProjectReferences(project);

            await utils.UserManager.sendMessage(
                projectData.author.id,
                {
                    type: "reject",
                    message,
                    hardReject: true,
                    title: projectData.title,
                },
                true,
                project,
            );

            utils.logs.sendAdminLog(
                {
                    action: `${username} hard rejected ${projectData.title}`,
                    content: "",
                    fields: [
                        {
                            name: "Mod",
                            value: username,
                        },
                        {
                            name: "Reason",
                            value: `\`\`\`\n${message}\n\`\`\``,
                        },
                        {
                            name: "Title",
                            value: projectData.title,
                        },
                        {
                            name: "ID",
                            value: project,
                        },
                        {
                            name: "Author",
                            value: projectData.author.username,
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
                0xe51810,
            );

            await utils.UserManager.resolveReports("project", project);

            res.status(200).json({ success: true });
        },
    );
};
