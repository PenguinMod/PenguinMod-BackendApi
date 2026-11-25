import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { OAuth2Client } from "google-auth-library";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/createoauthaccount", async function (req, res) {
        // get the method
        const packet = req.query;

        if (!(await utils.manager.auth.canCreateAccount())) {
            return res
                .status(403)
                .json({ error: "Account creation is not enabled" });
        }

        const method = String(packet.method);

        if (!method) {
            res.status(400).json({ error: "Missing method" });
            return;
        }

        const state = await utils.manager.auth.generateOAuth2State();
        switch (method) {
            case "scratch":
                res.redirect(
                    `https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${process.env.ScratchOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/scratchoauthcreate&scopes=identify&state=${state}`,
                );
                break;
            case "github":
                res.redirect(
                    `https://github.com/login/oauth/authorize?client_id=${process.env.GithubOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/githubcallback/createaccount&state=${state}&scope=read:user`,
                );
                break;
            case "google": {
                const oauth2Client = new OAuth2Client(
                    process.env.GoogleOAuthClientID,
                    process.env.GoogleOAuthClientSecret,
                    `${process.env.ApiURL}/api/v1/users/googlecallback/createaccount`,
                );

                // TODO: we don't need the access_type offline. but i don't want to mess with it without testing right now.
                const authorizeUrl = oauth2Client.generateAuthUrl({
                    access_type: "offline",
                    scope: [
                        "https://www.googleapis.com/auth/userinfo.profile",
                        "https://www.googleapis.com/auth/userinfo.email",
                    ],
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
