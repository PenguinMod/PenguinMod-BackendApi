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
    app.post('/api/v1/users/setbioadmin', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const bio = packet.bio;

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            utils.error(res, 400, "Unauthorized");
            return;
        }

        if (typeof bio !== "string") {
            utils.error(res, 400, "InvalidBioInput")
            return;
        }

        if (bio.length > 2048) {
            utils.error(res, 400, "BioLengthMustBeLessThan2048Chars")
            return;
        }

        const oldBio = await utils.UserManager.getBio(target);

        await utils.UserManager.setBio(target, bio);

        utils.logs.sendBioUpdateLog(username, target, oldBio, bio);
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}