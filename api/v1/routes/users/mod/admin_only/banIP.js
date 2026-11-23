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
                res.status(400).json({ error: "Could not convert to IPv6" });
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
                    fields: {
                        Mod: username,
                        "Target IP": `\`${targetIP}\``,
                    },
                },
                utils.logs.pmUserAuthor(username),
                toggle ? 0xc40404 : 0x45efc6,
            );

            res.status(200).json({ success: true });
        },
    );
};
