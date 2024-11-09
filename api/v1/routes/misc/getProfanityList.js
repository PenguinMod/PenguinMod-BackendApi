module.exports = (app, utils) => {
    app.get('/api/v1/misc/getProfanityList', utils.cors(), async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate")
            return;
        }
        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount")
            return;
        }
        const illegalWords = await utils.UserManager.getIllegalWords();
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json(illegalWords);
    });
}