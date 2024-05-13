module.exports = (app, utils) => {
    app.post('/api/v1/projects/manualfeature', async (req, res) => {
        const packet = req.body;

        const username = packet.username;
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
        
        return res.send({ success: true });
    });
}