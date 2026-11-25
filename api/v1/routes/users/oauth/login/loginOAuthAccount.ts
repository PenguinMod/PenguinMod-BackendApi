import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/loginoauthaccount", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = String(packet.method);

        if (!method) {
            res.status(400).json({ error: "Missing method" });
            return;
        }

        const state = await utils.UserManager.generateOAuth2State();
        switch (method) {
            case "scratch":
                res.redirect(
                    `https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${process.env.ScratchOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/scratchoauthlogin&scopes=identify&state=${state}`,
                );
                break;
            case "github":
                res.redirect(
                    `https://github.com/login/oauth/authorize?client_id=${process.env.GithubOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/githubcallback/login&state=${state}&scope=read:user`,
                );
                break;
            case "google": {
                const oauth2Client = new utils.googleOAuth2Client(
                    process.env.GoogleOAuthClientID,
                    process.env.GoogleOAuthClientSecret,
                    `${process.env.ApiURL}/api/v1/users/googlecallback/login`,
                );

                const authorizeUrl = oauth2Client.generateAuthUrl({
                    access_type: "offline",
                    scope: "https://www.googleapis.com/auth/userinfo.profile",
                    state: state,
                });

                res.redirect(authorizeUrl);
                break;
            }
            default:
                res.status(400).json({ error: "Invalid method" });
                return;
        }
    });
}
