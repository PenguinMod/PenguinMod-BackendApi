/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
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
                utils.error(res, 404, "NotFound");
                return;
            }
            if (await utils.UserManager.projectExists(newId, true)) {
                utils.error(res, 400, "IDTaken");
                return;
            }

            const projectName = (
                await utils.UserManager.getProjectMetadata(target)
            ).title;

            await utils.UserManager.changeProjectID(target, newId);

            const fields = [
                {
                    name: "Admin",
                    value: username,
                },
                {
                    name: "Title",
                    value: projectName,
                },
                {
                    name: "URL",
                    value: `${utils.env.StudioURL}/#${newId}`,
                },
            ];

            utils.logs.sendAdminLog(
                {
                    action: `Admin has changed project ${target}'s id to now be ${newId}.`,
                    content: `${username} changed a project's id`,
                    fields,
                },
                {
                    name: username,
                    icon_url: String(
                        `${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`,
                    ),
                    url: `${utils.env.HomeURL}/profile?user=${username}`,
                },
                0xc6be27,
            );

            res.status(200).json({ success: true });
        },
    );
};
