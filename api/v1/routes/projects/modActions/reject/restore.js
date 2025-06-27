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
    app.post('/api/v1/projects/restore', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const project = String(packet.project);

        if (!token || !project) {
            return utils.error(res, 400, "Missing token or project");
        }

        const login = await utils.UserManager.loginWithToken(null, token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

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