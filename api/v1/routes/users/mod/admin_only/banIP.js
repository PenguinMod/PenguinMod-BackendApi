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
        "/api/v1/users/banip",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const toggle = String(packet.toggle) === "true";

            let targetIP;
            try {
                targetIP = utils.ipaddr.parse(String(packet.targetIP));
                if (targetIP.kind() === "ipv4") {
                    targetIP = targetIP.toIPv4MappedAddress();
                }
                targetIP = targetIP.toNormalizedString();
            } catch (e) {
                utils.error(res, 400, "Could not convert to IPv6");
                return;
            }

            const username = req.login.username;

            // dont send a message since they cant access the site anyways :bleh:

            await utils.UserManager.banIP(targetIP, toggle);

            // TODO: should we log this ip or not?
            utils.logs.sendAdminLog(
                {
                    action: `IP has been ${toggle ? "" : "un"}banned`,
                    content: `${username} ${toggle ? "" : "un"}banned the IP: \`${targetIP}\``,
                    fields: [
                        {
                            name: "Mod",
                            value: username,
                        },
                        {
                            name: "Target IP",
                            value: `\`${targetIP}\``,
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
                toggle ? 0xc40404 : 0x45efc6,
            );

            res.status(200).json({ success: true });
        },
    );
};
