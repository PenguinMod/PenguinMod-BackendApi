import { Application } from "express";
import countryLookup from "../../../../../static/country-lookup.json";
import { Utils } from "../../../../../index";
import {
    corsMW,
    retryIfFailure,
    validateEmail,
} from "../../../../../utils/misc";
import rateLimit from "express-rate-limit";
import {
    pmUserAuthor,
    sendAdminLog,
    sendCreationLog,
} from "../../../../../utils/logs";
import { parseBirthday } from "../../../../../utils/auth";

const global_creation_counter = {
    count: 0,
    end: 0,
    ping: false,
};

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/createAccount",
        corsMW,
        rateLimit({
            validate: {
                trustProxy: true,
                xForwardedForHeader: true,
            },
            windowMs: 1000 * 100, // 1 requests per 100 seconds
            limit: 1,
            standardHeaders: "draft-7",
            legacyHeaders: false,
        }),
        async function (req, res) {
            const packet = req.body;

            const limit_timer =
                Number(process.env.GlobalAccountCreationTimer) || 60;
            const limit_amount =
                Number(process.env.GlobalAccountCreationLimit) || 5;

            const now = Date.now();
            if (global_creation_counter.end < now) {
                global_creation_counter.end = now + limit_timer * 1000;
                global_creation_counter.count = 0;
                // is this a good idea? idk
                global_creation_counter.ping = false;
            } else if (global_creation_counter.count >= limit_amount) {
                if (!global_creation_counter.ping) {
                    // TODO: don't hardcode my discord ID
                    sendAdminLog(
                        {
                            action: "actoin",
                            content: `<@790782926785609728> evil doer is doing evil maybe`,
                            fields: {},
                        },
                        pmUserAuthor("system"),
                        0xcc0000,
                    );

                    global_creation_counter.ping = true;
                }

                return res
                    .status(503)
                    .json({ error: "Please try again later." });
            }

            if (!(await utils.manager.auth.canCreateAccount())) {
                return res
                    .status(403)
                    .json({ error: "Account creation is not enabled" });
            }

            if (
                packet.username === null ||
                packet.password === null ||
                packet.birthday === null ||
                packet.country === null
            ) {
                return res.status(400).json({
                    error: "Missing username, password, birthday, or country",
                });
            }

            const username = String(packet.username).toLowerCase();
            const real_username = String(packet.username);
            const password = String(packet.password);

            const email = String(packet.email || "").toLowerCase();
            const birthday = String(packet.birthday);
            const countryCode = String(packet.country);
            const captcha_token = String(packet.captcha_token);

            if (username.length < 3 || username.length > 20) {
                return res.status(400).json({ error: "InvalidLengthUsername" });
            }
            if (username.match(/[^a-z0-9\-_]/i)) {
                return res.status(400).json({ error: "InvalidUsername" });
            }

            if (password.length < 8 || password.length > 50) {
                return res.status(400).json({ error: "InvalidLengthPassword" });
            }
            const passwordMeetsTextInclude =
                password.match(/[a-z]/) && password.match(/[A-Z]/);
            const passwordMeetsSpecialInclude =
                password.match(/[0-9]/) && password.match(/[^a-z0-9]/i);
            if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
                return res
                    .status(400)
                    .json({ error: "MissingRequirementsPassword" });
            }

            if (email && !validateEmail(email)) {
                return res.status(400).json({ error: "InvalidEmail" });
            }

            const parsedBirthday = parseBirthday(birthday);
            if (!parsedBirthday) {
                return res.status(400).json({ error: "InvalidBirthday" });
            }

            if (!countryLookup.countryCodes.includes(countryCode)) {
                return res.status(400).json({ error: "UnsupportedCountry" });
            }

            // ---- captcha ----

            if (process.env.CFCaptchaEnabled !== "false") {
                if (captcha_token.length > 2048) {
                    return res.status(400).json({ error: "InvalidCaptcha" });
                }

                const captchaBody: Record<string, string> = {
                    secret: String(process.env.CFCaptchaSecret),
                    response: captcha_token,
                    remoteip: req.realIPPlain,
                };

                let captchaResult: unknown = null;

                try {
                    await retryIfFailure(
                        async () => {
                            const resp = await fetch(
                                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                                {
                                    method: "POST",
                                    body: new URLSearchParams(captchaBody),
                                    signal: AbortSignal.timeout(5000),
                                },
                            );

                            if (!resp.ok) {
                                throw new Error(
                                    `Turnstile HTTP ${resp.status}`,
                                );
                            }

                            captchaResult = await resp.json();
                        },
                        3,
                        500,
                    );
                } catch (err) {
                    console.error("Turnstile verification unavailable:", err);
                    return res
                        .status(503)
                        .json({ error: "CaptchaServiceUnavailable" });
                }

                if (
                    !captchaResult ||
                    typeof captchaResult !== "object" ||
                    !("success" in captchaResult) ||
                    !captchaResult.success
                ) {
                    console.warn(
                        "Turnstile rejected:",
                        captchaResult &&
                            typeof captchaResult === "object" &&
                            "error-codes" in captchaResult
                            ? captchaResult["error-codes"]
                            : undefined,
                    );

                    return res.status(400).json({ error: "InvalidCaptcha" });
                }
            } else {
                console.warn(
                    "createAccount ran with CFCaptchaEnabled set to false",
                );
            }

            if (await utils.manager.users.getUserData(username)) {
                return res.status(400).json({ error: "AccountExists" });
            }

            if (email && (await utils.manager.users.getUserByEmail(email))) {
                return res.status(400).json({ error: "EmailInUse" });
            }

            const info = await utils.manager.auth.createAccount(
                username,
                real_username,
                password,
                {
                    email,
                    verified: false,
                },
                parsedBirthday,
                countryCode,
                false,
                true,
            );

            if (!info.ok) {
                return res.status(400).json({ error: info.error });
            }

            const token = info.value.token;
            const id = info.value.id;

            await utils.manager.users.addIPID(id, req.realIP);
            sendCreationLog(username, id, "", "account");

            global_creation_counter.count++;

            res.status(200).json({ token });
        },
    );
}
