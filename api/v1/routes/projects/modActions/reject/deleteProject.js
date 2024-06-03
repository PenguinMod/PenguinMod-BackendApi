module.exports = (app, utils) => {
    app.post('/api/v1/projects/hardDeleteProject', async (req, res) => {
        const packet = req.body;

        const projectID = String(packet.projectID);

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid username or token");
        }

        if (!projectID) {
            return utils.error(res, 404, "Project not found");
        }

        if (!await utils.UserManager.projectExists(projectID, true)) {
            return utils.error(res, 404, "Project not found");
        }

        const metadata = await utils.UserManager.getProjectMetadata(projectID);

        // only admins and the project owner can delete projects, not mods
        if (metadata.author.username !== username && !await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 403, "You are not authorized to delete this project");
        }

        if (metadata.author.username !== username) {
            utils.logs.sendAdminLog(
                {
                    action: `${username} hard deleted ${metadata.title}`,
                    content: "",
                    fields: [
                        {
                            name: "Mod",
                            value: username
                        },    
                        {
                            name: "Title",
                            value: metadata.title
                        },
                        {
                            name: "Author",
                            value: metadata.author.username
                        },
                        // send url because eventually we'll have the objects expire instead of just deleting them striaight away
                        {
                            name: "URL",
                            value: `https://studio.penguinmod.com/#${projectID}`
                        }
                    ]
                },
                {
                    name: username,
                    icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                    url: String("https://penguinmod.com/profile?user=" + username)
                },
                0x912323
            );

            // notify the author that their project has been deleted
            const userid = metadata.author.userid;
            await utils.UserManager.sendMessage(userid, {type: "delete", title: metadata.title}, false, projectID);
        }

        await utils.UserManager.deleteProject(projectID);

        return res.send({ success: true });
    });
}