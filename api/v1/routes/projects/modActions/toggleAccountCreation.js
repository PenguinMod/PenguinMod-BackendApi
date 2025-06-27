const UserManager = require("../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post('/api/v1/projects/toggleaccountcreation', utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const toggle = packet.toggle;

        if (!username || !token || typeof toggle !== "boolean") {
            return utils.error(res, 400, "Missing username, token, or toggle");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid Login");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        await utils.UserManager.setRuntimeConfigItem("accountCreationEnabled", toggle);

        utils.logs.sendAdminLog(
            {
                action: "Account creation has been toggled",
                content: `${username} toggled account creation to ${toggle}`,
                fields: [
                    {
                        name: "Admin",
                        value: username
                    },
                    {
                        name: "Status",
                        value: toggle
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xaf1157
        );

        return res.send({ success: true });
    });
}