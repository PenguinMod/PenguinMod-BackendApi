module.exports = (app, utils) => {
    app.post('/api/v1/users/setbioadmin', utils.cors(), async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const bio = packet.bio;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

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

        await utils.UserManager.setBio(user, bio);

        utils.logs.sendBioUpdateLog(username, target, oldBio, bio);
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}