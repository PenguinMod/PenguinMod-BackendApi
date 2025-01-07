module.exports = (app, utils) => {
    app.post('/api/v1/projects/interactions/voteToggle', utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const vote = packet.toggle;
        const projectID = String(packet.projectId);

        if (!username || !token || typeof vote !== "boolean" || !projectID) {
            return utils.error(res, 400, "Missing username, token, vote, or projectID");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const hasVoted = await utils.UserManager.hasVotedProject(projectID, id);

        if (hasVoted && vote) {
            return utils.error(res, 400, "Already voted");
        } else if (!hasVoted && !vote) {
            return utils.error(res, 400, "Not voted");
        }

        await utils.UserManager.voteProject(projectID, id, vote);

        const votes = await utils.UserManager.getProjectVotes(projectID);

        const metadata = await utils.UserManager.getProjectMetadata(projectID);

        if (votes >= utils.env.FeatureAmount && !await utils.UserManager.isFeatured(projectID)) {
            const author = metadata.author;
            const title = metadata.title;

            await utils.UserManager.sendMessage(author.id, {type: "projectFeatured"}, false, projectID);

            await utils.UserManager.featureProject(projectID, true);
            utils.logs.sendFeatureLog(projectID, title, author.username);

            if (!await utils.UserManager.hasBadge(author.username, "featured")) {
                await utils.UserManager.addBadge(author.username, "featured");
                await utils.UserManager.sendMessage(author.id, {type: "newBadge", badge: "featured"}, false, projectID);
            }
        }

        const author_username = metadata.author.username;

        if (votes >= utils.env.LoveAmount && !await utils.UserManager.hasBadge(author_username, "votes")) {
            await utils.UserManager.addBadge(author_username, "votes");
            await utils.UserManager.sendMessage(metadata.author.id, {type: "newBadge", badge: "votes"}, false, projectID);
        }
        
        return res.send({ success: true });
    });
}