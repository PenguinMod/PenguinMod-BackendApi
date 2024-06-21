module.exports = (app, utils) => {
    app.post("/api/v1/users/resetpassword/sendVerifyEmail", async (req, res) => {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            console.log("abc");
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
            utils.error(res, 400, "NoEmail");
        }

        if (!validateEmail(email)) {
            utils.error(res, 400, "EmailInvalid");
        }

        const state = await utils.UserManager.generatePasswordResetState();

        if (await utils.UserManager.isEmailVerified(username)) {
            console.log("def");
            utils.error(res, 400, "EmailAlreadyVerified");
            return;
        }

        const forgotPasswordUrl = `https://projects.penguinmod.com/api/v1/resetpassword/verifyemail?email=${email}&state=${state}`;

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

        // BTODO: make sure they havent sent an email in the last like 2 hours


        const userid = await utils.UserManager.getIDByUsername(username);

        const worked = await utils.UserManager.sendEmail(userid, req.realIP, "reset", email, username, "Reset Your Password", emailPlainText, emailHtml);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: worked });
    });
}