module.exports = (app, utils) => {
    app.post('/api/v1/projects/manualfeature', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const toggle = packet.toggle;
        const projectID = packet.projectID;

        if (!username || !token || !toggle || !projectID) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        await utils.UserManager.featureProject(projectID, toggle);

        utils.logs.sendAdminLog(
            {
                action: "Project has been manually featured",
                content: `${username} manually featured project ${projectID}`,
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },
                    {
                        name: "Project ID",
                        value: projectID
                    },
                    {
                        name: "Status",
                        value: toggle
                    },
                    {
                        name: "URL",
                        value: `https://studio.penguinmod.com/#${projectID}`
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xe5df18
        );
        
        return res.send({ success: true });
    });
}