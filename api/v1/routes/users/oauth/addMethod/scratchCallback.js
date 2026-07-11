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
    app.get("/api/v1/users/addscratchlogin", async function (req, res) {
        const packet = req.query;

        const scratch_username = String(packet.username).toLowerCase();
        const code = String(packet.code);

        if (!scratch_username || !code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        const userid = await utils.UserManager.verifyOAuth2State(state);
        if (!userid) {
            utils.error(res, 400, "InvalidState");
            return;
        }

        const data = await utils.UserManager.isValidScratchCode(scratch_username, code);

        if (!data.valid) {
            return utils.error(res, 400, "Invalid code");
        }

        const scratch_id = data.id;

        if (await utils.UserManager.OAuthMethodInUse(scratch_id, "scratch")) {
            utils.error(res, 400, "AccountAlreadyInUse");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (methods.includes("scratch")) {
            utils.error(res, 400, "Method already added");
            return;
        }

        await utils.UserManager.addOAuthMethod(
            username,
            "scratch",
            scratch_id,
        );

        const token = await utils.UserManager.newTokenGen(username);

        res.status(200);
        res.redirect(
            `/api/v1/users/sendloginsuccess?token=${token}&username=${username}`,
        );
    });
};
