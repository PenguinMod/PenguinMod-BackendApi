const countryLookup = require("../../../db/country-lookup.json");
/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

const global_creation_counter = {
    count: 0,
    end: 0,
    ping: false,
};

/**
 * @param {string} birthday
 * @returns {string|null} ISO string, or null if invalid
 */
const parseBirthday = (birthday) => {
    const date = new Date(birthday);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date.toISOString();
};

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/createAccount",
        utils.cors(),
        utils.rateLimiter({
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
                Number(utils.env.GlobalAccountCreationTimer) || 60;
            const limit_amount =
                Number(utils.env.GlobalAccountCreationLimit) || 5;

            const now = Date.now();
            if (global_creation_counter.end < now) {
                global_creation_counter.end = now + limit_timer * 1000;
                global_creation_counter.count = 0;
                // is this a good idea? idk
                global_creation_counter.ping = false;
            } else if (global_creation_counter.count >= limit_amount) {
                if (!global_creation_counter.ping) {
                    // TODO: don't hardcode my discord ID
                    utils.logs.sendAdminLog(
                        {
                            action: "actoin",
                            content: `<@790782926785609728> evil doer is doing evil maybe`,
                            fields: [],
                        },
                        {
                            name: "System",
                            icon_url: String(
                                `${utils.env.ApiURL}/api/v1/users/getpfp?username=system`,
                            ),
                            url: `${utils.env.HomeURL}/profile?user=system`,
                        },
                        0xcc0000,
                    );

                    global_creation_counter.ping = true;
                }

                return utils.error(res, 503, "Please try again later.");
            }

            if (!(await utils.UserManager.canCreateAccount())) {
                return utils.error(res, 403, "Account creation is not enabled");
            }

            if (
                packet.username === null ||
                packet.password === null ||
                packet.birthday === null ||
                packet.country === null
            ) {
                return utils.error(
                    res,
                    400,
                    "Missing username, password, birthday, or country",
                );
            }

            const username = String(packet.username).toLowerCase();
            const real_username = String(packet.username);
            const password = String(packet.password);

            const email = String(packet.email || "").toLowerCase();
            const birthday = String(packet.birthday);
            const countryCode = String(packet.country);
            const captcha_token = String(packet.captcha_token);

            if (username.length < 3 || username.length > 20) {
                return utils.error(res, 400, "InvalidLengthUsername");
            }
            if (username.match(/[^a-z0-9\-_]/i)) {
                return utils.error(res, 400, "InvalidUsername");
            }

            if (password.length < 8 || password.length > 50) {
                return utils.error(res, 400, "InvalidLengthPassword");
            }
            const passwordMeetsTextInclude =
                password.match(/[a-z]/) && password.match(/[A-Z]/);
            const passwordMeetsSpecialInclude =
                password.match(/[0-9]/) && password.match(/[^a-z0-9]/i);
            if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
                return utils.error(res, 400, "MissingRequirementsPassword");
            }

            if (email && !utils.UserManager.validateEmail(email)) {
                return utils.error(res, 400, "InvalidEmail");
            }

            const parsedBirthday = parseBirthday(birthday);
            if (!parsedBirthday) {
                return utils.error(res, 400, "InvalidBirthday");
            }

            if (!countryLookup.countryCodes.includes(countryCode)) {
                return utils.error(res, 400, "UnsupportedCountry");
            }

            // ---- captcha ----

            if (utils.env.CFCaptchaEnabled !== "false") {
                if (captcha_token.length > 2048) {
                    return utils.error(res, 400, "InvalidCaptcha");
                }

                const captchaBody = {
                    secret: utils.env.CFCaptchaSecret,
                    response: captcha_token,
                    remoteip: req.realIPPlain,
                };

                let captchaResult = null;

                try {
                    await utils.retryIfFailure(
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
                    return utils.error(res, 503, "CaptchaServiceUnavailable");
                }

                if (!captchaResult || !captchaResult.success) {
                    console.warn(
                        "Turnstile rejected:",
                        captchaResult?.["error-codes"],
                    );
                    return utils.error(res, 400, "InvalidCaptcha");
                }
            } else {
                console.warn(
                    "createAccount ran with CFCaptchaEnabled set to false",
                );
            }

            if (await utils.UserManager.existsByUsername(username, true)) {
                return utils.error(res, 400, "AccountExists");
            }

            if (email && (await utils.UserManager.emailInUse(email))) {
                return utils.error(res, 400, "EmailInUse");
            }

            const info = await utils.UserManager.createAccount(
                username,
                real_username,
                password,
                email,
                parsedBirthday,
                countryCode,
                false,
                utils,
                res,
            );

            if (!info) {
                return;
            }

            const token = info[0];
            const id = info[1];

            await utils.UserManager.addIPID(id, req.realIP);
            await utils.logs.sendCreationLog(username, id, "", "account");

            global_creation_counter.count++;

            res.status(200).json({ token });
        },
    );
};
