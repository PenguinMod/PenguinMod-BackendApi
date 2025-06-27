const UserManager = require("../../db/UserManager");

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
    app.post('/api/v1/users/banip', utils.cors(), async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const toggle = packet.toggle;

        let targetIP;
        try {
            targetIP = utils.ipaddr.parse(String(packet.targetIP));
            if (targetIP.kind() === "ipv4") {
                targetIP = targetIP.toIPv4MappedAddress()
            }
            targetIP = targetIP.toNormalizedString();
        } catch (e) {
            utils.error(res, 400, "Could not convert to IPv6");
            return;
        }

        if (!username || !token || typeof toggle !== "boolean") {
            utils.error(res, 400, "Missing username, token, or toggle");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        // dont send a message since they cant access the site anyways :bleh:

        await utils.UserManager.banIP(targetIP, toggle);

        utils.logs.sendAdminLog(
            {
                action: `IP has been ${toggle ? "" : "un"}banned`,
                content: `${username} ${toggle ? "" : "un"}banned the IP: \`${targetIP}\``,
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },
                    {
                        name: "Target IP",
                        value: `\`${targetIP}\``
                    },
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
        res.send({ success: true });
    });
}