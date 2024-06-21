require("dotenv").config();
const Mailjet = require('node-mailjet');

const mailjet = new Mailjet({
  apiKey: process.env.MJ_APIKEY_PUBLIC,
  apiSecret: process.env.MJ_APIKEY_PRIVATE
});

const forgotPasswordUrl = "https://example.com/";
const accountName = "JeremyGamer13";

const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd">
<html><body>
<p style='background-color: #129aeb; color: white; font-size: 48px; font-weight: bold; font-family: "Helvetica Neue", Arial, sans-serif; padding: 60px 10%;' align="center">PenguinMod Password Reset</p>
    <h1 style='font-family: "Helvetica Neue", Arial, sans-serif;'>Hello ${accountName}!</h1>
    <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>You are getting this email as someone has asked to reset the password for this PenguinMod account.</p>
<p style='font-family: "Helvetica Neue", Arial, sans-serif;'><a href="${forgotPasswordUrl}">Reset Password</a></p>
<br>
<p style='font-family: "Helvetica Neue", Arial, sans-serif;'>If you did not ask to reset your password, you can delete this email or ignore it.</p>
    <p style='font-family: "Helvetica Neue", Arial, sans-serif;'>Do not forward, share, or reply to this email. Replies will not be seen or answered.</p>

<img src="https://penguinmod.com/favicon.png" alt="PenguinMod" width="64" height="64" style="width: 64px; height: 64px;">
</body></html>`;
const emailPlainText = `PenguinMod Password Reset

********************
Hello ${accountName}!
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

mailjet.post('send', { version: 'v3.1' })
.request({
    Messages: [
        {
            "From": {
            "Email": "no-reply@penguinmod.com",
            "Name": "Penguinmod"
            },
            "To": [
            {
                "Email": "ianlouishawthorne@gmail.com",
                "Name": "ian"
            }
            ],
            "Subject": "abc",
            "TextPart": emailPlainText,
            "HTMLPart": emailHtml,
        }
    ]
})
.then(res => console.log(res.response.data))
.catch(err => console.log(`err ${err}`));