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
    app.post(
        "/api/v1/users/scratchoauthlogin/generate",
        utils.cors(),
        async function (req, res) {
            const packet = req.body || {};
            const username = packet.username ? String(packet.username).trim() : "";

            if (!username) {
                utils.error(res, 400, "Missing username");
                return;
            }

            const code = await utils.UserManager.generateScratchVerifyCode(username);

            res.status(200);
            res.json({ code });
        },
    );

    app.post(
        "/api/v1/users/scratchoauthlogin/verify",
        utils.cors(),
        async function (req, res) {
            const packet = req.body || {};
            const code = packet.code ? String(packet.code) : "";
            const username = packet.username ? String(packet.username).trim() : "";

            if (!code || !username) {
                utils.error(res, 400, "Missing code or username");
                return;
            }

            const codeCheck = await utils.UserManager.verifyScratchVerifyCode(
                code,
                username,
            );

            if (!codeCheck.success) {
                utils.error(res, 400, codeCheck.error);
                return;
            }

            let scratchUser;
            try {
                const userResponse = await fetch(
                    `https://api.scratch.mit.edu/users/${username}`,
                );
                if (!userResponse.ok) {
                    utils.error(res, 404, "ScratchUserNotFound");
                    return;
                }
                scratchUser = await userResponse.json();
            } catch (e) {
                utils.error(res, 500, "OAuthServerDidNotRespond");
                return;
            }

            let hasCode;
            try {
                hasCode = await utils.UserManager.checkScratchCommentsForCode(
                    username,
                    code,
                );
            } catch (e) {
                utils.error(res, 500, "FailedToFetchComments");
                return;
            }

            if (!hasCode) {
                res.status(400);
                res.json({
                    error: "CodeNotFoundInComments",
                    instructions:
                        "Please post the code as a comment on your Scratch profile",
                });
                return;
            }

            const userid = await utils.UserManager.getUserIDByOAuthID(
                "scratch",
                scratchUser.id,
            );

            if (!userid) {
                utils.error(res, 400, "MethodNotConnected");
                return;
            }

            let username_;
            try {
                username_ = await utils.UserManager.getUsernameByID(userid);
            } catch (e) {
                utils.error(
                    res,
                    500,
                    "This is an error. Please report this stuff: " +
                        JSON.stringify({
                            scratch_id: scratchUser.id,
                            userid: userid,
                        }),
                );
                return;
            }

            const token = await utils.UserManager.newTokenGen(username_);

            await utils.UserManager.addIPID(userid, req.realIP);

            res.status(200);
            res.json({ success: true, token, username: username_ });
        },
    );
};
