module.exports = (app, utils) => {
    app.post('/api/v1/projects/softreject', async (req, res) => {
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

        if (await utils.UserManager.isSoftRejected(project)) {
            return utils.error(res, 400, "AlreadySoftRejected");
        }

        await utils.UserManager.softReject(project, true);

        const projectData = await utils.UserManager.getProjectMetadata(project);

        await utils.UserManager.sendMessage(projectData.author.id, {type: "reject", message, hardReject: false}, true, project);

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
                        name: "Message",
                        value: `\`\`\`\n${message}\n\`\`\``
                    },
                    {
                        name: "Author",
                        value: projectData.author.username
                    },
                    {
                        name: "URL",
                        value: `https://studio.penguinmod.com/#${project}`
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xffae33
        );

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}