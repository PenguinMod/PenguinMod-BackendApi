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
        "/api/v1/projects/softreject",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.body;

            const project = String(packet.project);
            const message = String(packet.message);

            const username = req.login.username;

            // multiple DB queries being made (wasteful)
            if (
                !project ||
                !(await utils.UserManager.projectExists(project, true))
            ) {
                return utils.error(res, 404, "ProjectNotFound");
            }

            if (await utils.UserManager.isSoftRejected(project)) {
                return utils.error(res, 400, "AlreadySoftRejected");
            }

            await utils.UserManager.softReject(project, true);

            const projectData =
                await utils.UserManager.getProjectMetadata(project);

            await utils.UserManager.sendMessage(
                projectData.author.id,
                { type: "reject", message, hardReject: false },
                true,
                project,
            );

            utils.logs.sendAdminLog(
                {
                    action: `${username} soft rejected ${projectData.title}`,
                    content: "",
                    fields: [
                        {
                            name: "Mod",
                            value: username,
                        },
                        {
                            name: "Title",
                            value: projectData.title,
                        },
                        {
                            name: "Message",
                            value: `\`\`\`\n${message}\n\`\`\``,
                        },
                        {
                            name: "Author",
                            value: projectData.author.username,
                        },
                        {
                            name: "URL",
                            value: `${utils.env.StudioURL}/#${project}`,
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
                0xffae33,
            );

            await utils.UserManager.resolveReports("project", project);

            res.status(200).json({ success: true });
        },
    );
};
