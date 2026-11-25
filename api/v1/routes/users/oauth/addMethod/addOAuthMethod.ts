import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { OAuthMethod } from "../../../../db/types";
import { OAuth2Client } from "google-auth-library";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/addoauthmethod", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = String(packet.method);
        const code = String(packet.code);

        const token = await utils.manager.auth.exchangeCodeForToken(code);

        if (!token) {
            return res.status(401).json({ error: "InvalidCode" });
        }

        const login = await utils.manager.auth.loginWithToken(token, false);

        if (!login) {
            return res.status(401).json({ error: "InvalidToken" });
        }

        const methods = await utils.manager.auth.getOAuthMethods(login.id);

        if (methods.includes(method as OAuthMethod)) {
            res.status(400).json({ error: "Method already added" });
            return;
        }

        const state = await utils.manager.auth.generateOAuth2State(login.id);
        switch (method) {
            case "scratch":
                res.redirect(
                    `https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${process.env.ScratchOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/addscratchlogin&scopes=identify&state=${state}`,
                );
                break;
            case "github":
                res.redirect(
                    `https://github.com/login/oauth/authorize?client_id=${process.env.GithubOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/githubcallback/addmethod&state=${state}&scope=read:user`,
                );
                break;
            case "google": {
                const oauth2Client = new OAuth2Client(
                    process.env.GoogleOAuthClientID,
                    process.env.GoogleOAuthClientSecret,
                    `${process.env.ApiURL}/api/v1/users/googlecallback/addmethod`,
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
