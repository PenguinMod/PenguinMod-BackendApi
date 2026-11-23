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
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            if (await utils.UserManager.isSoftRejected(project)) {
                return res.status(400).json({ error: "AlreadySoftRejected" });
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
                    fields: {
                        Mod: username,
                        Title: projectData.title,
                        Message: `\`\`\`\n${message}\n\`\`\``,
                        Author: projectData.author.username,
                        URL: `${process.env.StudioURL}/#${project}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xffae33,
            );

            await utils.UserManager.resolveReports("project", project);

            res.status(200).json({ success: true });
        },
    );
};
