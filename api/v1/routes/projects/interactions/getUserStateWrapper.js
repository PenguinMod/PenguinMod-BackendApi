module.exports = (app, utils) => {
    app.get('/api/v1/projects/getuserstatewrapper', async (req, res) => {
        const packet = req.query;
        
        const username = packet.username;
        const token = packet.token;

        const projectID = packet.projectId;

        if (!username || !token || !projectID) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const hasLoved = await utils.UserManager.hasLovedProject(projectID, id);
        const hasVoted = await utils.UserManager.hasVotedProject(projectID, id);

        return res.send({ hasLoved, hasVoted });
    });
}