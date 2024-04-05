module.exports = (app, utils) => {
    app.get('/api/v1/users/setProfanityList', async function (req, res) {
        const packet = req.query;
        if (!await UserManager.loginWithToken(packet.user, packet.passcode)) {
            utils.error(res, 400, "Reauthenticate")
            return;
        }
        if (!await utils.UserManager.isAdmin(Cast.toString(packet.user))) {
            utils.error(res, 403, "FeatureDisabledForThisAccount")
            return;
        }

        const words = packet.json;
        if (typeof words !== 'object') {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const types = ["illegalWords", "illegalWebsites", "spacedOutWordsOnly", "potentiallyUnsafeWords", "potentiallyUnsafeWordsSpacedOut"];
        for (const key in words) {
            if (typeof words[key] !== 'string') {
                utils.error(res, 400, "InvalidData");
                return;
            }

            if (!types.includes(key)) {
                utils.error(res, 400, "InvalidData");
                return;
            }

            await utils.UserManager.setIllegalWords(words[key], key);
        }
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}