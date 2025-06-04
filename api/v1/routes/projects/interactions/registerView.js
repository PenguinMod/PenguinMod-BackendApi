module.exports = (app, utils) => {
    app.post('/api/v1/projects/interactions/registerView', utils.cors(), async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const projectID = String(packet.projectID);

        if (!username || !token || !projectID) {
            return utils.error(res, 400, "Missing username, token, love, or projectID");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const projectMeta = await utils.UserManager.getProjectMetadata(projectID);

        const instructions = projectMeta.instructions;
        const notes = projectMeta.notes;

        const concatted = instructions + "\n\n" + notes;

        await utils.UserManager.collectAndInteractView(id, concatted);
        
        return res.send({ success: true });
    });
}