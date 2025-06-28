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
    app.post('/api/v1/users/deleteaccount', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;
        const target = (String(packet.target)).toLowerCase();
        const reason = packet.reason;

        if (!token || !target || typeof reason !== "string" || reason.length > 512) {
            return utils.error(res, 400, "Missing token, target, or reason, or reason is too long");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Unauthorized");
        }

        if (!await utils.UserManager.existsByUsername(target, true)) {
            return utils.error(res, 404, "TargetNotFound");
        }

        const success = await utils.UserManager.deleteAccount(target);

        // ---- LOGGING ----
        let fields = [
            {
                name: "Mod",
                value: username
            },
            {
                name: "Target",
                value: target
            },
            
        ]

        fields.push(
            {
                name: "Reason",
                value: `\`\`\`\n${reason}\n\`\`\``
            },
        )

        utils.logs.sendAdminLog(
            {
                action: `User's account has been deleted`,
                content: `${username} deleted ${target}'s account`,
                fields
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xc40404
        );

        res.status(success ? 200 : 500);
        res.header('Content-type', "application/json");
        res.send({ success });
    });
}