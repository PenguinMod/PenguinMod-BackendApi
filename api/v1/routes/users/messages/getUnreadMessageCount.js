const UserManager = require("../../../db/UserManager");

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
    app.get('/api/v1/users/getunreadmessagecount', utils.cors(), async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        let count = await utils.UserManager.getUnreadMessageCount(id);

        const lastPolicyUpdates = await utils.UserManager.getLastPolicyUpdate(username);
        const lastPolicyReads = await utils.UserManager.getLastPolicyRead(username);

        const hasReadTOS = lastPolicyReads.TOS >= lastPolicyUpdates.TOS;
        const hasReadPrivacyPolicy = lastPolicyReads.privacyPolicy >= lastPolicyUpdates.privacyPolicy;
        const hasReadGuidelines = lastPolicyReads.guidelines >= lastPolicyUpdates.guidelines;

        count += hasReadTOS ? 0 : 1;
        count += hasReadPrivacyPolicy ? 0 : 1;
        count += hasReadGuidelines ? 0 : 1;

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ count: count });
    });
}