import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { corsMW } from "../../../../../../utils/misc";
import rateLimit from "express-rate-limit";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/resetpassword/sendEmail",
        corsMW,
        rateLimit({
            validate: {
                trustProxy: true,
                xForwardedForHeader: true,
            },
            windowMs: 1000 * 60 * 60, // x requests per hour
            limit: 60,
            standardHeaders: "draft-7",
            legacyHeaders: false,
        }),
        async function (req, res) {
            const packet = req.body;

            const email = String(packet.email).toLowerCase();
            const captcha_token = String(packet.captcha_token);

            if (!email || !captcha_token) {
                res.status(400).json({ error: "MissingFields" });
                return;
            }

            if (process.env.CFCaptchaEnabled !== "false") {
                if (captcha_token.length > 2048) {
                    res.status(400).json({ error: "InvalidCaptcha" });
                    return;
                }

                const captcha_success = await fetch(
                    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: `secret=${process.env.CFCaptchaSecret}&response=${captcha_token}`,
                    },
                ).then((res) => res.json());

                if (!captcha_success.success) {
                    res.status(400).json({ error: "InvalidCaptcha" });
                    return;
                }
            } else {
                console.warn(
                    "resetpassword/sendEmail ran with CFCaptchaEnabled set to false",
                );
            }

            const userData = await utils.manager.users.getUserByEmail(email);

            if (!userData) {
                res.status(400).json({ error: "InvalidEmail" });
                return;
            }

            const userid = userData.id;
            const userip = req.realIP;

            const lastEmailSentID =
                await utils.manager.users.lastEmailSentByID(userid);
            const lastEmailSendIP =
                await utils.manager.users.lastEmailSentByIP(userip);

            const lastEmailSent =
                Number(lastEmailSentID) > Number(lastEmailSendIP)
                    ? lastEmailSentID
                    : lastEmailSendIP;

            const emailCooldown = Number(process.env.EmailCooldown) || 0;
            if (
                Date.now() - (lastEmailSent ? lastEmailSent.getDate() : 0) <
                1000 * 60 * emailCooldown
            ) {
                res.status(429).json({ error: "Cooldown" });
                return;
            }

            const state = await utils.manager.auth.generatePasswordResetState(
                email,
                userid,
                false,
            );

            const forgotPasswordUrl = `${process.env.HomeURL}/resetpassword?state=${encodeURIComponent(state)}&email=${encodeURIComponent(email)}`;

            const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd">
        <html><body>
        <p style='background-color: #129aeb; color: white; font-size: 48px; font-weight: bold; font-family: "Helvetica Neue", Arial, sans-serif; padding: 60px 10%;' align="center">PenguinMod Password Reset</p>
            <h1 style='font-family: "Helvetica Neue", Arial, sans-serif;'>Hello ${userData.username}!</h1>
            <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>You are getting this email as someone has asked to reset the password for this PenguinMod account.</p>
        <p style='font-family: "Helvetica Neue", Arial, sans-serif;'><a href="${forgotPasswordUrl}">Reset Password</a></p>
        <br>
        <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>If you did not ask to reset your password, you can delete this email or ignore it.</p>
            <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>Do not forward, share, or reply to this email. Replies will not be seen or answered.</p>

        <img src="${process.env.HomeURL}/favicon.png" alt="PenguinMod" width="64" height="64" style="width: 64px; height: 64px;">
        </body></html>`;
            const emailPlainText = `PenguinMod Password Reset

        ********************
        Hello ${userData.username}!
        ********************

        You are getting this email as someone has asked to reset the
        password for this PenguinMod account.

        Reset Password:
        ${forgotPasswordUrl}

        If you did not ask to reset your password, you can delete this
        email or ignore it.

        Do not forward, share, or reply to this email. Replies will
        not be seen or answered.

        PenguinMod`;

            const success = await utils.manager.users.sendEmail(
                userid,
                req.realIP,
                "reset",
                email,
                userData.username,
                "Reset Your Password",
                emailPlainText,
                emailHtml,
            );

            if (!success) {
                res.status(500).json({ error: "EmailFailed" });
                return;
            }

            res.status(200).json({ success: true });
        },
    );
}
