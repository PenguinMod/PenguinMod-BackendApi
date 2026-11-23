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
        "/api/v1/projects/restore",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.body;

            const project = String(packet.project);

            if (!project) {
                return utils.error(res, 400, "Missing project");
            }

            const username = req.login.username;

            // TODO: fetch meta once
            if (!(await utils.UserManager.projectExists(project))) {
                return utils.error(res, 404, "ProjectNotFound");
            }

            if (!(await utils.UserManager.isSoftRejected(project))) {
                return utils.error(res, 400, "NotSoftRejected");
            }

            await utils.UserManager.softReject(project, false);

            const projectData =
                await utils.UserManager.getProjectMetadata(project);
            const author = projectData.author.id;

            await utils.UserManager.sendMessage(
                author,
                { type: "restored" },
                false,
                project,
            );

            utils.logs.sendAdminLog(
                {
                    action: "Project has been restored",
                    content: `${username} restored project ${project}`,
                    fields: {
                        Mod: username,
                        "Project ID": project,
                        URL: `${utils.env.StudioURL}/#${project}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0x2de65d,
            );

            res.status(200).json({ success: true });
        },
    );
};
