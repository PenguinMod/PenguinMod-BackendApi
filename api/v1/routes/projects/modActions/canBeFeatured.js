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
        "/api/v1/projects/setCanBeFeatured",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.body;

            const projectID = String(packet.projectID);
            const canBeFeatured = String(packet.toggle) === "true";
            const username = req.login.username;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return utils.error(res, 404, "Project not found");
            }

            await utils.UserManager.setCanBeFeatured(projectID, canBeFeatured);

            utils.logs.sendAdminLog(
                {
                    action: `Project ${canBeFeatured ? "can" : "cannot"} be featured now`,
                    content: `${username} changed featurability of ${projectID}`,
                    fields: [
                        {
                            name: "Admin",
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
                0xc8e847,
            );

            res.status(200).json({ success: true });
        },
    );
};
