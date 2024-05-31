module.exports = (app, utils) => {
    app.post('/api/v1/projects/hardreject', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = String(packet.project);
        const message = packet.message;

        if (!username || !token || !project || typeof message !== "string") {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(project, true)) {
            return utils.error(res, 404, "ProjectNotFound");
        }

        if (await utils.UserManager.isHardRejected(project)) {
            //return utils.error(res, 400, "AlreadySoftRejected");
        }

        await utils.UserManager.hardRejectProject(project);

        const projectData = await utils.UserManager.getProjectMetadata(project);

        await utils.UserManager.sendMessage(projectData.author.id, {type: "reject", message, hardReject: true, title: projectData.title}, true, project);

        utils.logs.sendAdminLog(
            {
                action: `${username} hard rejected ${projectData.title}`,
                content: "",
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },    
                    {
                        name: "Title",
                        value: projectData.title
                    },
                    {
                        name: "ID",
                        value: project
                    },
                    {
                        name: "Author",
                        value: projectData.author.username
                    },
                ]
            },
            {
                name: username,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                url: String("https://penguinmod.com/profile?user=" + username)
            }
        );

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}