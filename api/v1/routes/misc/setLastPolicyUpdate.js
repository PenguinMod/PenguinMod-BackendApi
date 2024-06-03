module.exports = (app, utils) => {
    app.post('/api/v1/misc/setLastPolicyUpdate', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Forbidden")
            return;
        }

        const types = packet.types;

        for (const type of types) {
            switch (type) {
                case "privacyPolicy":
                    await utils.UserManager.setLastPrivacyPolicyUpdate();
                    break;
                case "tos":
                    await utils.UserManager.setLastTOSUpdate();
                    break;
                case "guidelines":
                    await utils.UserManager.setLastGuidelinesUpdate();
                    break;
                default:
                    utils.error(res, 400, "Invalid type")
                    return;
            }
        }

        utils.logs.sendAdminLog(
            {
                action: "Last policy update has been set",
                content: `${username} set the last policy update for ${types}`,
                fields: [
                    {
                        name: "Admin",
                        value: username
                    },
                    {
                        name: "Types",
                        value: `\`${types}\``
                    },
                    {
                        name: "Date",
                        value: new Date().toISOString()
                    }
                ]
            },
            {
                name: username,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xff33de
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ success: true });
    });
}