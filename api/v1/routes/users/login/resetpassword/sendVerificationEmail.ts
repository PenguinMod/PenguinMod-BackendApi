import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { validateEmail } from "../../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/resetpassword/sendVerifyEmail",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const username = res.locals.login.username;
            const userid = res.locals.login.id;
            const email = res.locals.login.email;
            const emailVerified = res.locals.login.emailVerified;

            if (email === "") {
                res.status(400).json({ error: "EmailInvalid" });
                return;
            }

            if (emailVerified) {
                res.status(400).json({ error: "EmailAlreadyVerified" });
                return;
            }

            if (!validateEmail(email)) {
                res.status(400).json({ error: "EmailInvalid" });
                return;
            }

            const lastEmailSentID =
                await utils.manager.users.lastEmailSentByID(userid);
            const lastEmailSendIP = await utils.manager.users.lastEmailSentByIP(
                req.realIP,
            );

            const lastEmailSent =
                Number(lastEmailSentID) > Number(lastEmailSendIP)
                    ? lastEmailSentID
                    : lastEmailSendIP;

            const emailCooldown = Number(process.env.EmailCooldown) || 0;
            if (
                Date.now() - (lastEmailSent ? Number(lastEmailSent) : 0) <
                1000 * 60 * emailCooldown
            ) {
                res.status(429).json({ error: "Cooldown" });
                return;
            }

            const state = await utils.manager.auth.generatePasswordResetState(
                email,
                userid,
                true,
            );
            const verifyEmailUrl = `${process.env.ApiURL}/api/v1/resetpassword/verifyemail?email=${encodeURIComponent(email)}&state=${encodeURIComponent(state)}`;

            const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd">
        <html><body>
        <p style='background-color: #129aeb; color: white; font-size: 48px; font-weight: bold; font-family: "Helvetica Neue", Arial, sans-serif; padding: 60px 10%;' align="center">PenguinMod Email Verification</p>
            <h1 style='font-family: "Helvetica Neue", Arial, sans-serif;'>Hello ${username}!</h1>
            <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>You are getting this email as someone has requested to set this email address as an email for the &quot;${username}&quot; PenguinMod account.</p>
            <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>Opening the link below will set this as the email address for the &quot;${username}&quot; PenguinMod account.</p>
        <p style='font-family: "Helvetica Neue", Arial, sans-serif;'><a href="${verifyEmailUrl}">Verify this email</a></p>
        <br>
        <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>If you did not request for this to be a PenguinMod account's email, you can delete this email or ignore it.</p>
            <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>Do not forward, share, or reply to this email. Replies will not be seen or answered.</p>

        <img src="${process.env.HomeURL}/favicon.png" alt="PenguinMod" width="64" height="64" style="width: 64px; height: 64px;">
        </body></html>`;
            const emailPlainText = `PenguinMod Email Verification

        ********************
        Hello ${username}!
        ********************

        You are getting this email as someone has requested to set
        this email address as an email for the "${username}" PenguinMod account.

        Opening the link below will set this as the email address
        for the "${username}" PenguinMod account.

        Verify this email:
        ${verifyEmailUrl}

        If you did not request for this to be a PenguinMod account's email,
        you can delete this email or ignore it.

        Do not forward, share, or reply to this email. Replies will
        not be seen or answered.

        PenguinMod`;

            const err = await utils.manager.users.sendEmail(
                userid,
                req.realIP,
                "verify",
                email,
                username,
                "Verify your email",
                emailPlainText,
                emailHtml,
            );

            if (err) {
                console.warn(`Sending email to ${email} failed`);
                res.status(500).json({ error: err });
                return;
            }

            res.status(200).json({ success: true });
        },
    );
}
