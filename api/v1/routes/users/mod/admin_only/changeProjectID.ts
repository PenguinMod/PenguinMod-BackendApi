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
        "/api/v1/users/changeprojectid",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            // TODO: this might be broken? related to assets.

            const target = String(packet.target);
            const newId = String(packet.newId);

            const username = req.login.username;

            if (
                !target ||
                !(await utils.UserManager.projectExists(target, true))
            ) {
                res.status(404).json({ error: "NotFound" });
                return;
            }
            if (await utils.UserManager.projectExists(newId, true)) {
                res.status(400).json({ error: "IDTaken" });
                return;
            }

            const projectName = (
                await utils.UserManager.getProjectMetadata(target)
            ).title;

            await utils.UserManager.changeProjectID(target, newId);

            utils.logs.sendAdminLog(
                {
                    action: `Admin has changed project ${target}'s id to now be ${newId}.`,
                    content: `${username} changed a project's id`,
                    fields: {
                        Admin: username,
                        Title: projectName,
                        URL: `${process.env.StudioURL}/#${newId}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xc6be27,
            );

            res.status(200).json({ success: true });
        },
    );
};
