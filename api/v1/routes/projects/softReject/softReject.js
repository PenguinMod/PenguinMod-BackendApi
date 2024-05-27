module.exports = (app, utils) => {
    app.post('/api/v1/projects/softreject', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = packet.project;
        const message = packet.message;

        if (!username || !token || typeof project !== "number" || typeof message !== "string") {
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

        if (await utils.UserManager.isSoftRejected(project)) {
            return utils.error(res, 400, "AlreadySoftRejected");
        }

        await utils.UserManager.softReject(project, true);

        const projectData = await utils.UserManager.getProjectMetadata(project);

        await utils.UserManager.sendMessage(projectData.author.id, message, true, project);

        utils.logs.sendAdminLog(
            {
                action: `${username} soft rejected ${projectData.title}`,
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
                        name: "Author",
                        value: projectData.author.username
                    },
                    // send url because eventually we'll have the objects expire instead of just deleting them striaight away
                    {
                        name: "URL",
                        value: `https://studio.penguinmod.com/#${project}`
                    }
                ]
            },
            {
                name: username,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                url: String("https://penguinmod.com/profile?user=" + username)
            }
        );

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}