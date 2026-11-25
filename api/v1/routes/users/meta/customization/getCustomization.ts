import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/customization/getCustomization",
        utils.requireAuth(utils.UserManager, { require_supporter: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            if (!target) {
                res.status(400).json({ error: "Missing target" });
                return;
            }

            const exists = await utils.UserManager.existsByUsername(
                target,
                false,
            );
            if (!exists) {
                res.status(404).json({ error: "User does not exist" });
                return;
            }

            const badges = await utils.UserManager.getBadges(target);
            if (!badges.includes("donator")) {
                res.status(400).json({ error: "NotDonator" });
                return;
            }

            // if disabled just return default {}
            if (await utils.UserManager.getUserCustomizationDisabled(target)) {
                res.status(200);
                res.header("Content-Type", "application/json");
                return res.send({ customization: "{}" });
            }

            const customization =
                await utils.UserManager.getUserCustomization(target);
            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ customization });
        },
    );
}
