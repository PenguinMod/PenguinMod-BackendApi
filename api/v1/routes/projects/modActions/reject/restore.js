module.exports = (app, utils) => {
    app.post('/api/v1/projects/restore', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = String(packet.project);

        if (!username || !token || !project) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(project)) {
            return utils.error(res, 404, "ProjectNotFound");
        }

        if (!await utils.UserManager.isSoftRejected(project)) {
            return utils.error(res, 400, "NotSoftRejected");
        }

        await utils.UserManager.softReject(project, false);

        const projectData = await utils.UserManager.getProjectMetadata(project);
        const author = projectData.author.id;

        await utils.UserManager.sendMessage(author, {type: "restored"}, false, project);

        utils.logs.sendAdminLog(
            {
                action: "Project has been restored",
                content: `${username} restored project ${project}`,
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },
                    {
                        name: "Project ID",
                        value: project
                    },
                    {
                        name: "URL",
                        value: `${utils.env.StudioURL}/#${project}`
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0x2de65d
        );

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}