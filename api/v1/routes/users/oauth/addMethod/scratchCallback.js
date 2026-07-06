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
        "/api/v1/users/addoauthmethod/scratch/generate",
        utils.cors(),
        async function (req, res) {
            const packet = req.body || {};
            const token = packet.token ? String(packet.token) : "";
            const username = packet.username ? String(packet.username).trim() : "";

            if (!token || !username) {
                utils.error(res, 400, "Missing token or username");
                return;
            }

            const login = await utils.UserManager.loginWithToken(token);
            if (!login.success) {
                utils.error(res, 400, "Reauthenticate");
                return;
            }

            const methods = await utils.UserManager.getOAuthMethods(
                login.username,
            );
            if (methods.includes("scratch")) {
                utils.error(res, 400, "MethodAlreadyAdded");
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
        "/api/v1/users/addoauthmethod/scratch/verify",
        utils.cors(),
        async function (req, res) {
            const packet = req.body || {};
            const token = packet.token ? String(packet.token) : "";
            const code = packet.code ? String(packet.code) : "";
            const username = packet.username ? String(packet.username).trim() : "";

            if (!token || !code || !username) {
                utils.error(res, 400, "Missing token, code, or username");
                return;
            }

            const login = await utils.UserManager.loginWithToken(token);
            if (!login.success) {
                utils.error(res, 400, "Reauthenticate");
                return;
            }

            const methods = await utils.UserManager.getOAuthMethods(
                login.username,
            );
            if (methods.includes("scratch")) {
                utils.error(res, 400, "MethodAlreadyAdded");
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

            const existingOwner = await utils.UserManager.getUserIDByOAuthID(
                "scratch",
                scratchUser.id,
            );
            if (existingOwner) {
                utils.error(res, 400, "ScratchAccountAlreadyLinked");
                return;
            }

            await utils.UserManager.addOAuthMethod(
                login.username,
                "scratch",
                scratchUser.id,
            );

            const newToken = await utils.UserManager.newTokenGen(
                login.username,
            );

            res.status(200);
            res.json({ success: true, token: newToken, username: login.username });
        },
    );
};
