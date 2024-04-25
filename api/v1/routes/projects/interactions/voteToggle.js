module.exports = (app, utils) => {
    app.post('/api/v1/projects/interactions/voteToggle', async (req, res) => {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        const vote = packet.vote;
        const projectID = packet.projectID;

        if (!username || !token || !vote || !projectID) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        if (await utils.UserManager.hasVotedProject(projectID, id)) {
            return utils.error(res, 400, "Already voted");
        }

        await utils.ProjectManager.voteProject(projectID, vote);

        const votes = await utils.ProjectManager.getProjectVotes(projectID);

        await utils.ProjectManager.featureProject(projectID, votes >= utils.env.FeatureAmount);
        
        return res.send({ success: true });
    });
}