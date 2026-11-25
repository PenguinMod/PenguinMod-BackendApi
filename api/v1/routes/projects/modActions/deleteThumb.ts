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
                return res.status(404).json({ error: "Project not found" });
            }

            await utils.UserManager.deleteThumb(projectID);

            utils.logs.sendAdminLog(
                {
                    action: `Project's thumbnail has been deleted`,
                    content: `${username} deleted ${projectID}'s thumbnail`,
                    fields: {
                        Mod: username,
                        "Project ID": projectID,
                        URL: `${process.env.StudioURL}/#${projectID}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xc96800,
            );

            res.status(200).json({ success: true });
        },
    );
};
