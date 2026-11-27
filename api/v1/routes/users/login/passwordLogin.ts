import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { corsMW } from "../../../../../utils/misc";
import rateLimit from "express-rate-limit";
import { makeUsername } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/passwordLogin",
        corsMW,
        rateLimit({
            validate: {
                trustProxy: true,
                xForwardedForHeader: true,
            },
            windowMs: 1000, // 1 requests per 1 second
            limit: 1,
            standardHeaders: "draft-7",
            legacyHeaders: false,
        }),
        async function (req, res) {
            const packet = req.body;

            const username = makeUsername(String(packet.username));
            const password = String(packet.password);
            const captcha_token = String(packet.captcha_token);

            if (process.env.CFCaptchaEnabled === "false") {
                console.warn(
                    "passwordLogin ran with CFCaptchaEnabled set to false",
                );
            } else {
                if (captcha_token.length > 2048) {
                    res.status(400).json({ error: "InvalidCaptcha" });
                    return;
                }

                const success = await fetch(
                    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: `secret=${process.env.CFCaptchaSecret}&response=${captcha_token}`,
                    },
                ).then((res) => res.json());

                if (!success.success) {
                    res.status(400).json({ error: "InvalidCaptcha" });
                    return;
                }
            }

            const data = await utils.manager.auth.loginWithPassword(
                username,
                password,
                true,
            );
            if (!data.ok) {
                res.status(401).json({ error: data.error });
                return;
            }

            await utils.manager.users.addIP(data.value.id, req.realIP);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ token: data.value.token });
        },
    );
}
