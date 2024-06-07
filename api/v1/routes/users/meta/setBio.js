export default (app, utils) => {
    app.post('/api/v1/users/setBio', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const bio = packet.bio;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
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

        if (await utils.UserManager.checkForIllegalWording(bio)) {
            utils.error(res, 400, "IllegalWordsUsed")

            const illegalWordIndex = await utils.UserManager.getIndexOfIllegalWording(bio);

            const before = bio.substring(0, illegalWordIndex[0]);
            const after = bio.substring(illegalWordIndex[1], bio.length);
            const illegalWord = bio.substring(illegalWordIndex[0], illegalWordIndex[1]);

            const userID = await utils.UserManager.getIDByUsername(username);

            utils.logs.sendHeatLog(
                before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                "profileBio",
                [username, userID]
            )
            
            return;
        }

        if (await utils.UserManager.checkForSlightlyIllegalWording(bio)) {
            const illegalWordIndex = await utils.UserManager.getIndexOfSlightlyIllegalWording(bio);

            const before = bio.substring(0, illegalWordIndex[0]);
            const after = bio.substring(illegalWordIndex[1], bio.length);
            const illegalWord = bio.substring(illegalWordIndex[0], illegalWordIndex[1]);

            const userID = await utils.UserManager.getIDByUsername(username);

            utils.logs.sendHeatLog(
                before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                "profileBio",
                [username, userID]
            )
        }

        await utils.UserManager.setBio(username, bio);
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}