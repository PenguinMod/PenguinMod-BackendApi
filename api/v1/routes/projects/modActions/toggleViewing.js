module.exports = (app, utils) => {
    app.post('/api/v1/projects/toggleviewing', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const toggle = packet.toggle;

        if (!username || !token || !toggle) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        utils.env.ViewingEnabled = toggle;

        utils.logs.sendAdminLog(
            {
                action: "Project viewing has been toggled",
                content: `${username} toggled project viewing to ${toggle}`,
                fields: [
                    {
                        name: "Admin",
                        value: username
                    },
                    {
                        name: "Status",
                        value: toggle
                    }
                ]
            },
            {
                name: username,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                url: String("https://penguinmod.com/profile?user=" + username)
            }
        );

        return res.send({ success: true });
    });
}