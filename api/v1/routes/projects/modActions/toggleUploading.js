module.exports = (app, utils) => {
    app.post('/api/v1/projects/toggleuploading', utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const toggle = packet.toggle;

        if (!username || !token || typeof toggle !== "boolean") {
            return utils.error(res, 400, "Missing username, token, or toggle");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid Login");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        await utils.UserManager.setRuntimeConfigItem("uploadingEnabled", toggle);

        utils.logs.sendAdminLog(
            {
                action: "Project uploading has been toggled",
                content: `${username} toggled project uploading to ${toggle}`,
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
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xaf1157
        );

        return res.send({ success: true });
    });
}