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
    app.get("/api/v1/users/scratchcallback/login", async function (req, res) {
        const packet = req.query;

        const real_username = String(packet.username).trim();
        const scratch_username = real_username.toLowerCase();
        const code = String(packet.code);

        if (!code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        const data = await utils.UserManager.isValidScratchCode(
            scratch_username,
            code,
        );

        if (!data.valid) {
            // TODO: we should maybe redir back to the original page, or we should rework how this works
            // (instead of rediring to backend, we send a request then if it succeeds just write the
            // username/token)
            return utils.error(res, 400, "Invalid code");
        }

        const userid = await utils.UserManager.getUserIDByOAuthID(
            "scratch",
            data.id,
        );

        if (!userid) {
            // the method is not connected with an account
            utils.error(res, 400, "MethodNotConnected");
            return;
        }

        let username;
        try {
            username = await utils.UserManager.getUsernameByID(userid);
        } catch (e) {
            utils.error(
                res,
                500,
                "This is an error. Please report this stuff: " +
                    JSON.stringify({
                        scratch_id: data.id,
                        userid: userid,
                    }),
            );
            return;
        }

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIPID(userid, req.realIP);

        res.status(200);
        res.redirect(
            `/api/v1/users/sendloginsuccess?token=${token}&username=${username}`,
        );
    });
};
