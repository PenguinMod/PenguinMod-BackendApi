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
    app.get("/api/v1/users/scratchcallback/create", async function (req, res) {
        const packet = req.query;

        const real_username = String(packet.username).trim();
        const username = real_username.toLowerCase();
        const code = String(packet.code);

        if (!code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        const data = await utils.UserManager.isValidScratchCode(username, code);

        if (!data.valid) {
            // TODO: we should maybe redir back to the original page, or we should rework how this works
            // (instead of rediring to backend, we send a request then if it succeeds just write the
            // username/token)
            return utils.error(res, 400, "Invalid code");
        }

        if (await utils.UserManager.getUserIDByOAuthID("scratch", data.id)) {
            utils.error(res, 400, "AccountExists");
            return;
        }

        // create the user
        const userdata = await utils.UserManager.makeOAuth2Account(
            "scratch",
            { id: data.id, username, real_username },
            utils,
            res,
        );

        if (!userdata) {
            utils.error(res, 400, "UnknownError");
            return;
        }

        const profilePicture = await fetch(
            `https://trampoline.turbowarp.org/avatars/by-username/${username}`,
        )
            .then((res) => res.arrayBuffer())
            .catch((e) => {
                utils.error(res, 500, "InternalError");
                return new Promise((resolve, reject) => resolve());
            });

        if (!profilePicture) {
            return;
        }

        const pfp_buffer = Buffer.from(profilePicture);

        await utils.UserManager.setProfilePicture(
            userdata.username,
            pfp_buffer,
        );

        const accountUsername = userdata.username;
        const token = userdata.token;

        await utils.UserManager.addIPID(userdata.id, req.realIP);
        await utils.logs.sendCreationLog(
            accountUsername,
            userdata.id,
            "",
            "account",
        );

        res.status(200);
        res.redirect(
            `${utils.env.HomeURL}/loginsuccess?token=${token}&username=${username}`,
        );
    });
};
