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
    app.post("/api/v1/users/changeUsername", utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;
        const newUsername = String(packet.newUsername).toLowerCase();

        if (!token || !newUsername) {
            utils.error(res, 400, "Missing token or newUsername");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        const usernameDoesNotMeetLength = newUsername.length < 3 || newUsername.length > 20;
        const usernameHasIllegalChars = newUsername.match(/[^a-z0-9\-_]/i);
        if (usernameDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthUsername");
            return;
        }
        if (usernameHasIllegalChars) {
            utils.error(res, 400, "InvalidUsername");
            return;
        }

        const illegalWordingError = async (text, type) => {
            const trigger = await utils.UserManager.checkForUnsafeUsername(text);
            if (trigger) {
                utils.error(res, 400, "IllegalWordsUsed");
    
                const illegalWordIndex = await utils.UserManager.getIndexOfUnsafeUsername(text);

                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(illegalWordIndex[0], illegalWordIndex[1]);
    
                utils.logs.sendHeatLog(
                    before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    type,
                    username
                );
                
                return true;
            }
            return false;
        }

        const potentiallyIllegalWordingError = async (text, type) => {
            let trigger = await utils.UserManager.checkForPotentiallyUnsafeUsername(text);
            if (trigger) {
                const illegalWordIndex = await utils.UserManager.getIndexOfPotentiallyUnsafeUsername(text);

                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(illegalWordIndex[0], illegalWordIndex[1]);
    
                utils.logs.sendHeatLog(
                    before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    type,
                    username,
                    0xffbb00,
                )
                return true;
            }
            return false;
        }

        if (await illegalWordingError(newUsername, "username")) {
            // function already errors
            return;
        }

        await potentiallyIllegalWordingError(newUsername, "username");

        const exists = await utils.UserManager.existsByUsername(newUsername, true);
        if (exists) {
            utils.error(res, 404, "UsernameTaken");
            return;
        }

        const id = await utils.UserManager.getIDByUsername(username);

        utils.logs.sendRenameLog(username, newUsername, id);

        if (await utils.UserManager.isOnWatchlist(username)) {
            utils.logs.watchlist.sendUsernameUpdateLog(username, newUsername, id);
        }

        await utils.UserManager.changeUsername(username, newUsername, String(packet.newUsername));

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    })
}
