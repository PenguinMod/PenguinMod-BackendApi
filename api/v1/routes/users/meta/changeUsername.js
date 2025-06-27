const UserManager = require("../../db/UserManager");

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

        const username = String(packet.username).toLowerCase();
        const token = packet.token;
        const newUsername = String(packet.newUsername).toLowerCase();

        if (!username || !token || !newUsername) {
            utils.error(res, 400, "Missing username, token, or newUsername");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

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
            const trigger = await utils.UserManager.checkForIllegalWording(text);
            if (trigger) {
                utils.error(res, 400, "IllegalWordsUsed");
    
                const illegalWordIndex = await utils.UserManager.getIndexOfIllegalWording(text);

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

        const slightlyIllegalWordingError = async (text, type) => {
            let trigger = await utils.UserManager.checkForSlightlyIllegalWording(text);
            if (trigger) {
                const illegalWordIndex = await utils.UserManager.getIndexOfSlightlyIllegalWording(text);
    
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

        await slightlyIllegalWordingError(newUsername, "username");

        const exists = await utils.UserManager.existsByUsername(newUsername, true);
        if (exists) {
            utils.error(res, 404, "UsernameTaken");
            return;
        }

        const id = await utils.UserManager.getIDByUsername(username);

        utils.logs.sendRenameLog(username, newUsername, id);

        await utils.UserManager.changeUsername(username, newUsername, String(packet.newUsername));

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    })
}
