module.exports = (app, utils) => {
    app.post('/api/v1/projects/interactions/loveToggle', async (req, res) => {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        const love = packet.love;
        const projectID = packet.projectID;

        if (!username || !token || !love || !projectID) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        if (await utils.UserManager.hasLovedProject(projectID, id)) {
            return utils.error(res, 400, "Already loved");
        }

        await utils.ProjectManager.loveProject(projectID, love);
        
        return res.send({ success: true });
    });
}