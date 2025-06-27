const UserManager = require("../../db/UserManager");

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
    app.post("/api/v1/users/resetpassword/sendVerifyEmail", utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = String(packet.username).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        const email = await utils.UserManager.getEmail(username);

        const validateEmail = (email) => {
            return email.match(
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
        };

        if (email === "") {
            utils.error(res, 400, "EmailInvalid");
            return;
        }

        if (!validateEmail(email)) {
            utils.error(res, 400, "EmailInvalid");
            return;
        }

        if (await utils.UserManager.isEmailVerified(username)) {
            utils.error(res, 400, "EmailAlreadyVerified");
            return;
        }

        const userid = await utils.UserManager.getIDByUsername(username);

        const lastEmailSentID = await utils.UserManager.lastEmailSentByID(userid);
        const lastEmailSendIP = await utils.UserManager.lastEmailSentByIP(req.realIP);

        const lastEmailSent = lastEmailSentID > lastEmailSendIP ? lastEmailSentID : lastEmailSendIP;

        if (Date.now() - (lastEmailSent ? lastEmailSent : 0) < 1000 * 60 * 60 * 2) {
            utils.error(res, 400, "Cooldown");
            return;
        }

        const state = await utils.UserManager.generatePasswordResetState(email);

        const verifyEmailUrl = `https://projects.penguinmod.com/api/v1/resetpassword/verifyemail?email=${email}&state=${state}`;

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

        <img src="https://penguinmod.com/favicon.png" alt="PenguinMod" width="64" height="64" style="width: 64px; height: 64px;">
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

        const success = await utils.UserManager.sendEmail(userid, req.realIP, "verify", email, username, "Verify your email", emailPlainText, emailHtml);

        if (!success) {
            utils.error(res, 500, "EmailFailed");
            return;
        }

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}