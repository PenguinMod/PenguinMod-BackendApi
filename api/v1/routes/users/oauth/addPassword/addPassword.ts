import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/addpasswordtooauth", async function (req, res) {
        const packet = req.query;

        const method = String(packet.method);
        const code = String(packet.code);

        const token = await utils.UserManager.exchangeCodeForToken(code);

        if (!token) {
            return res.status(401).json({ error: "InvalidCode" });
        }

        const login = await utils.UserManager.loginWithToken(token);

        if (!login.success) {
            return res.status(401).json({ error: "InvalidToken" });
        }

        const methods = await utils.UserManager.getOAuthMethods(login.id);

        if (!methods) {
            res.status(400).json({
                error: "No login methods (PLEASE REPORT THIS VIA OUR SUPPORT PAGE)",
            });
            return;
        }

        if (!methods.includes(method)) {
            return res.status(404).json({ error: "MethodNotFound" });
        }

        // TODO: we need to verify that the person actually sending the step to "final" is this person.
        // intermediate breaks shit. it sucks.
        // really, we should probably just rewrite this whole oauth flow for like everything.
        // but that'll take a little bit so i'll do it later
        const state = await utils.UserManager.generateOAuth2State(login.id);
        switch (method) {
            case "scratch":
                res.redirect(
                    `https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${process.env.ScratchOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/scratchaddpassword&scopes=identify&state=${state}`,
                );
                break;
            case "github":
                res.redirect(
                    `https://github.com/login/oauth/authorize?client_id=${process.env.GithubOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/githubcallback/addpassword&state=${state}&scope=read:user`,
                );
                break;
            case "google": {
                const oauth2Client = new utils.googleOAuth2Client(
                    process.env.GoogleOAuthClientID,
                    process.env.GoogleOAuthClientSecret,
                    `${process.env.ApiURL}/api/v1/users/googlecallback/addpassword`,
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
