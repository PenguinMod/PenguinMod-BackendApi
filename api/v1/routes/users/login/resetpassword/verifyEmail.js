module.exports = (app, utils) => {
    app.get("/api/v1/resetpassword/verifyemail", utils.cors(), async (req, res) => {
        const packet = req.query;

        const email = packet.email;
        const state = packet.state;

        if (!await utils.UserManager.verifyPasswordResetState(state)) {
            utils.error(res, 401, "InvalidState. Your link has most likely expired, please try again.");
            return;
        }

        const username = await utils.UserManager.getUsernameByEmail(email);

        if (!username) {
            utils.error(res, 400, "InvalidEmail");
            return;
        }

        await utils.UserManager.setEmailVerified(username, true);

        res.redirect(utils.env.HomeURL);
    })
}