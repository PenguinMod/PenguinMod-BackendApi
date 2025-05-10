module.exports = (app, utils) => {
    app.post("/api/v1/users/customization/setCustomization", utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;
        const customization = packet.customization;

        if (!username || !token || typeof(customization) !== "string") {
            utils.error(res, 400, "Missing username, token, or customization");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        const badges = await utils.UserManager.getBadges(username);

        if (!badges.includes("donator")) {
            utils.error(res, 403, "MissingPermission");
            return;
        }

        await utils.UserManager.setUserCustomization(username, customization);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}