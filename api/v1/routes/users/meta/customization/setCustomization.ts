import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    /*
    app.post(
        "/api/v1/users/customization/setCustomization",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const customization = String(packet.customization);

            if (!customization) {
                res.status(400).json({ error: "Missing customization" });
                return;
            }

            const username = res.locals.login.username;
            const isMod = res.locals.login.isMod;

            if (!isMod && !res.locals.login.isDonator) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            // you can change other people's customization if you are a mod
            const target = packet.target
                ? String(packet.target).toLowerCase()
                : null;
            if (target && !isMod) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            if (!target) {
                if (
                    await utils.UserManager.getUserCustomizationDisabled(
                        username,
                    )
                ) {
                    res.status(403).json({
                        error: "FeatureDisabledForThisAccount",
                    });
                    return;
                }
            }

            const errorReason =
                utils.UserManager.verifyCustomizationJson(customization);
            if (errorReason) {
                return res.status(400).json({ error: errorReason });
            }
            await utils.UserManager.setUserCustomization(
                target || username,
                customization,
            );

            res.status(200).json({ success: true });
        },
    );
    */
}
