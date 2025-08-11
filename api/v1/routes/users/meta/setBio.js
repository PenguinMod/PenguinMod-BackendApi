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
    app.post('/api/v1/users/setBio', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const bio = packet.bio;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (typeof bio !== "string") {
            utils.error(res, 400, "InvalidBioInput")
            return;
        }

        if (bio.length > 2048) {
            utils.error(res, 400, "BioLengthMustBeLessThan2048Chars")
            return;
        }

        let trigger = await utils.UserManager.checkForIllegalWording(bio);
        if (trigger) {
            utils.error(res, 400, "IllegalWordsUsed")

            const illegalWordIndex = await utils.UserManager.getIndexOfIllegalWording(bio);

            const before = bio.substring(0, illegalWordIndex[0]);
            const after = bio.substring(illegalWordIndex[1], bio.length);
            const illegalWord = bio.substring(illegalWordIndex[0], illegalWordIndex[1]);

            const userID = await utils.UserManager.getIDByUsername(username);

            utils.logs.sendHeatLog(
                before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                trigger,
                "profileBio",
                [username, userID]
            )
            
            return;
        }

        trigger = await utils.UserManager.checkForSlightlyIllegalWording(bio);
        if (trigger) {
            const illegalWordIndex = await utils.UserManager.getIndexOfSlightlyIllegalWording(bio);

            const before = bio.substring(0, illegalWordIndex[0]);
            const after = bio.substring(illegalWordIndex[1], bio.length);
            const illegalWord = bio.substring(illegalWordIndex[0], illegalWordIndex[1]);

            const userID = await utils.UserManager.getIDByUsername(username);

            utils.logs.sendHeatLog(
                before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                trigger,
                "profileBio",
                [username, userID],
                0xffbb00,
            )
        }

        await utils.UserManager.setBio(username, bio);
        
        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ "success": true });
    });
}