const UserManager = require("../../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post("/api/v1/users/resetpassword/sendEmail", utils.cors(), utils.rateLimiter({
        validate: {
            trustProxy: true,
            xForwardedForHeader: true,
        },
        windowMs: 1000 * 60 * 60,  // x requests per hour
        limit: 60,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
    }), async (req, res) => {
        const packet = req.body;

        const email = packet.email;
        const captcha_token = packet.captcha_token;

        if (!email || !captcha_token) {
            utils.error(res, 400, "MissingFields");
            return;
        }

        if (utils.env.CFCaptchaEnabled !== "false") {
            if (captcha_token.length > 2048) {
                utils.error(res, 400, "InvalidCaptcha");
                return;
            }
    
            const captcha_success = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: `secret=${utils.env.CFCaptchaSecret}&response=${captcha_token}`
            }).then(res => res.json());
    
            if (!captcha_success.success) {
                utils.error(res, 400, "InvalidCaptcha");
                return;
            }
        } else {
            console.warn("resetpassword/sendEmail ran with CFCaptchaEnabled set to false");
        }

        if (!await utils.UserManager.emailInUse(email)) {
            utils.error(res, 400, "EmailNotFound");
            return;
        }

        const username = await utils.UserManager.getUsernameByEmail(email);

        if (!username) {
            utils.error(res, 400, "InvalidEmail");
            return;
        }

        if (!await utils.UserManager.isEmailVerified(username)) {
            utils.error(res, 400, "EmailNotVerified");
            return;
        }

        const userid = await utils.UserManager.getIDByUsername(username);
        const userip = req.realIP;

        const lastEmailSentID = await utils.UserManager.lastEmailSentByID(userid);
        const lastEmailSendIP = await utils.UserManager.lastEmailSentByIP(userip);

        const lastEmailSent = lastEmailSentID > lastEmailSendIP ? lastEmailSentID : lastEmailSendIP;

        if (Date.now() - (lastEmailSent ? lastEmailSent : 0) < 1000 * 60 * 60 * 2) { // 2 hours
            utils.error(res, 400, "Cooldown");
            return;
        }

        const state = await utils.UserManager.generatePasswordResetState(email);

        const forgotPasswordUrl = `${utils.env.HomeURL}/resetpassword?state=${state}&email=${email}`;

        const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd">
        <html><body>
        <p style='background-color: #129aeb; color: white; font-size: 48px; font-weight: bold; font-family: "Helvetica Neue", Arial, sans-serif; padding: 60px 10%;' align="center">PenguinMod Password Reset</p>
            <h1 style='font-family: "Helvetica Neue", Arial, sans-serif;'>Hello ${username}!</h1>
            <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>You are getting this email as someone has asked to reset the password for this PenguinMod account.</p>
        <p style='font-family: "Helvetica Neue", Arial, sans-serif;'><a href="${forgotPasswordUrl}">Reset Password</a></p>
        <br>
        <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>If you did not ask to reset your password, you can delete this email or ignore it.</p>
            <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>Do not forward, share, or reply to this email. Replies will not be seen or answered.</p>

        <img src="https://penguinmod.com/favicon.png" alt="PenguinMod" width="64" height="64" style="width: 64px; height: 64px;">
        </body></html>`;
        const emailPlainText = `PenguinMod Password Reset

        ********************
        Hello ${username}!
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

        const success = await utils.UserManager.sendEmail(userid, req.realIP, "reset", email, username, "Reset Your Password", emailPlainText, emailHtml);

        if (!success) {
            utils.error(res, 500, "EmailFailed");
            return;
        }

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send();
    });
}
