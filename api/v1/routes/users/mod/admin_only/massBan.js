const UserManager = require("../../../../db/UserManager");

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
    app.post('/api/v1/users/massbanregex', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const toggle = packet.toggle;

        const targetRegex = packet.targetRegex;

        if (!token || !targetRegex || typeof toggle !== "boolean") {
            utils.error(res, 400, "Missing token, target, or toggle");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        // dont send a message since they cant access the site anyways :bleh:

        const count = await utils.UserManager.massBanByUsername(targetRegex, toggle);

        utils.logs.sendAdminLog(
            {
                action: `Admin has mass ${toggle ? "" : "un"}banned by regex \`${targetRegex}\``,
                content: `${username} ${toggle ? "" : "un"}banned by regex: \`${targetRegex}\``,
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },
                    {
                        name: "Target Regex",
                        value: `\`${targetRegex}\``
                    },
                    {
                        name: "Count banned",
                        value: `${count}`
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            toggle ? 0xc40404 : 0x45efc6
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true, count });
    });
}