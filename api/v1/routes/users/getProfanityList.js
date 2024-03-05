module.exports = (app, utils) => {
    app.get('/api/v1/users/getProfanityList', async function (req, res) {
        const packet = req.query;
        if (!UserManager.isCorrectCode(packet.user, packet.passcode)) {
            utils.error(res, 400, "Reauthenticate")
            return;
        }
        if (!AdminAccountUsernames.get(Cast.toString(packet.user))) {
            utils.error(res, 403, "FeatureDisabledForThisAccount")
            return;
        }
        const illegalWords = utils.UserManager.getIllegalWords();
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json(illegalWords);
    });
}