module.exports = (app, utils) => {
    app.post('/api/v1/projects/interactions/loveToggle', utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const love = packet.toggle;
        const projectID = String(packet.projectId);

        if (!username || !token || typeof love !== "boolean" || !projectID) {
            return utils.error(res, 400, "Missing username, token, love, or projectID");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        if (await utils.UserManager.hasLovedProject(projectID, id) && love) {
            return utils.error(res, 400, "Already loved");
        }

        const projectMeta = await utils.UserManager.getProjectMetadata(projectID);
        const loves = projectMeta.loves;
        const authorID = projectMeta.author.id;
        const authorUsername = projectMeta.author.username;

        if (loves >= utils.env.LoveAmount && !await utils.UserManager.hasBadge(authorUsername, "likes")) {
            await utils.UserManager.addBadge(authorUsername, "likes");
            await utils.UserManager.sendMessage(authorID, {type: "newBadge", badge: "likes"}, false, projectID);
        }

        await utils.UserManager.loveProject(projectID, id, love);
        
        return res.send({ success: true });
    });
}