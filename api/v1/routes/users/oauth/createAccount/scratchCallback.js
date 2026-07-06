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
        "/api/v1/users/createoauthaccount/scratch/generate",
        utils.cors(),
        async function (req, res) {
            if (!(await utils.UserManager.canCreateAccount())) {
                utils.error(res, 403, "Account creation is not enabled");
                return;
            }

            const packet = req.body || {};
            const username = packet.username ? String(packet.username).trim() : "";

            if (!username) {
                utils.error(res, 400, "Missing username");
                return;
            }

            const code = await utils.UserManager.generateScratchVerifyCode(
                username,
            );

            res.status(200);
            res.json({ code });
        },
    );

    app.post(
        "/api/v1/users/createoauthaccount/scratch/verify",
        utils.cors(),
        async function (req, res) {
            if (!(await utils.UserManager.canCreateAccount())) {
                utils.error(res, 403, "Account creation is not enabled");
                return;
            }

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

            if (
                await utils.UserManager.getUserIDByOAuthID(
                    "scratch",
                    scratchUser.id,
                )
            ) {
                utils.error(res, 400, "AccountExists");
                return;
            }

            const userdata = await utils.UserManager.makeOAuth2Account(
                "scratch",
                { user_name: scratchUser.username, user_id: scratchUser.id },
                utils,
                res,
            );

            if (!userdata) {
                utils.error(res, 400, "UnknownError");
                return;
            }

            // best shot at getting the pfp
            try {
                const profilePicture = await fetch(
                    `https://trampoline.turbowarp.org/avatars/by-username/${scratchUser.username.toLowerCase()}`,
                ).then((r) => r.arrayBuffer());

                await utils.UserManager.setProfilePicture(
                    userdata.username,
                    Buffer.from(profilePicture),
                );
            } catch (e) {
                console.warn(
                    `Failed to import scratch pfp for ${userdata.username}: ${e}`,
                );
            }

            await utils.UserManager.addIPID(userdata.id, req.realIP);
            await utils.logs.sendCreationLog(
                userdata.username,
                userdata.id,
                "",
                "account",
            );

            res.status(200);
            res.json({
                success: true,
                token: userdata.token,
                username: userdata.username,
            });
        },
    );
};
