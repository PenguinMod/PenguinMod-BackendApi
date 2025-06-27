const UserManager = require("../../db/UserManager");

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
    app.post('/api/v1/projects/hardreject', utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = String(packet.project);
        const message = packet.message;

        if (!username || !token || !project || typeof message !== "string") {
            return utils.error(res, 400, "Missing username, token, project, or message");
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
            return utils.error(res, 400, "AlreadyHardRejected");
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
                        name: "Reason",
                        value: `\`\`\`\n${message}\n\`\`\``
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
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xe51810
        );

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}