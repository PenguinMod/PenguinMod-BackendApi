import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/banip",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
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

            const username = res.locals.login.username;

            // dont send a message since they cant access the site anyways :bleh:

            await utils.UserManager.banIP(targetIP, toggle);

            // TODO: should we log this ip or not?
            sendAdminLog(
                {
                    action: `IP has been ${toggle ? "" : "un"}banned`,
                    content: `${username} ${toggle ? "" : "un"}banned the IP: \`${targetIP}\``,
                    fields: {
                        Mod: username,
                        "Target IP": `\`${targetIP}\``,
                    },
                },
                pmUserAuthor(username),
                toggle ? 0xc40404 : 0x45efc6,
            );

            res.status(200).json({ success: true });
        },
    );
}
