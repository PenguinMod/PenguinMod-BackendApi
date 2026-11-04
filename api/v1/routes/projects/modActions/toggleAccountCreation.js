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
        "/api/v1/projects/toggleaccountcreation",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.body;

            const toggle = String(packet.toggle) === "true";

            const username = req.login.username;

            await utils.UserManager.setRuntimeConfigItem(
                "accountCreationEnabled",
                toggle,
            );

            utils.logs.sendAdminLog(
                {
                    action: "Account creation has been toggled",
                    content: `${username} toggled account creation to ${toggle}`,
                    fields: [
                        {
                            name: "Admin",
                            value: username,
                        },
                        {
                            name: "Status",
                            value: toggle,
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
                0xaf1157,
            );

            res.status(200).json({ success: true });
        },
    );
};
