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
    app.get("/api/v1/users/githubcallback/addpasswordfinal", async function (req, res) {
        const packet = req.query;

        const access_token = packet.at;
        const password = packet.password;

        if (!access_token || !password) {
            utils.error(res, 400, "Missing access_token or password");
            return;
        }

        const passwordDoesNotMeetLength = packet.password.length < 8 || packet.password.length > 50;
        const passwordMeetsTextInclude = packet.password.match(/[a-z]/) && packet.password.match(/[A-Z]/);
        const passwordMeetsSpecialInclude = packet.password.match(/[0-9]/) && packet.password.match(/[^a-z0-9]/i);
        if (passwordDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthPassword");
            return;
        }
        if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
            utils.error(res, 400, "MissingRequirementsPassword");
            return;
        }

        const user = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        })
        .then(async res => {
            return {"user": await res.json(), "status": res.status};
        })
        .catch(e => {
            utils.error(res, 500, "OAuthServerDidNotRespond");
            return new Promise((resolve, reject) => resolve());
        })

        if (!user) {
            return;
        }

        if (user.status !== 200) {
            utils.error(res, 500, "InternalError");
            return;
        }

        const userid = await utils.UserManager.getUserIDByOAuthID("github", user.user.id);
        const username = await utils.UserManager.getUsernameByID(userid);

        await utils.UserManager.changePassword(username, password);

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIPID(userid, req.realIP);

        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}