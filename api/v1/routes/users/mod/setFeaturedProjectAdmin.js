/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/setmyfeaturedprojectadmin",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const project = String(packet.project);
            const title = Number(packet.title);

            const username = req.login.username;

            if (!project || !(await utils.UserManager.projectExists(project))) {
                utils.error(res, 400, "InvalidProject");
                return;
            }

            // TODO: pretty sure this is not the correct range
            if (packet.title < 0 || packet.title > 500) {
                utils.error("InvalidTitleType");
            }

            // TODO: verify user exists

            await utils.UserManager.setFeaturedProject(target, project);
            await utils.UserManager.setFeaturedProjectTitle(target, title);

            utils.logs.sendAdminUserLog(
                username,
                target,
                "Admin or mod has updated user's featured project.",
                0xc1e518,
                [
                    {
                        name: "Project",
                        value: project,
                    },
                    {
                        name: "Title",
                        value: title,
                    },
                ],
            );

            res.status(200).json({ success: true });
        },
    );
};
