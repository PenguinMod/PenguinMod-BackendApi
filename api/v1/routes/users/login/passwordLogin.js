/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/passwordLogin",
        utils.cors(),
        utils.rateLimiter({
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

            const username = String(packet.username).toLowerCase();
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

            const token = await utils.UserManager.loginWithPassword(
                username,
                password,
                true,
            );
            if (!token) {
                res.status(401).json({ error: "InvalidCredentials" });
                return;
            }

            await utils.UserManager.addIP(username, req.realIP);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ token: token });
        },
    );
};
