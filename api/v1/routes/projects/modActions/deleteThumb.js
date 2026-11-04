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
        "/api/v1/projects/deletethumb",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.body;

            const projectID = String(packet.projectID);
            const username = req.login.username;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return utils.error(res, 404, "Project not found");
            }

            await utils.UserManager.deleteThumb(projectID);

            utils.logs.sendAdminLog(
                {
                    action: `Project's thumbnail has been deleted`,
                    content: `${username} deleted ${projectID}'s thumbnail`,
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
                0xc96800,
            );

            res.status(200).json({ success: true });
        },
    );
};
