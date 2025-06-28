const UserManager = require("../../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post('/api/v1/projects/hardDeleteProject', utils.cors(), async (req, res) => {
        const packet = req.body;

        const projectID = String(packet.projectID);

        const token = packet.token;
        const reason = packet.reason;

        if (!token) {
            return utils.error(res, 400, "Missing token");
        }

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

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
                    action: `${username} **full deleted** ${metadata.title}`,
                    content: "",
                    fields: [
                        {
                            name: "Mod",
                            value: username
                        },    
                        {
                            name: "Reason",
                            value: `\`\`\`\n${reason}\n\`\`\``
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
                            value: `${utils.env.StudioURL}.com/#${projectID}`
                        }
                    ]
                },
                {
                    name: username,
                    icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                    url: String("https://penguinmod.com/profile?user=" + username)
                },
                0x912323
            );

            // notify the author that their project has been deleted
            const userid = metadata.author.userid;
            await utils.UserManager.sendMessage(userid, {type: "delete", title: metadata.title, message: reason}, false, projectID);
        }

        await utils.UserManager.deleteProject(projectID);

        return res.send({ success: true });
    });
}