export default (app, utils) => {
    app.get('/api/v1/projects/hasLoved', async (req, res) => {
        const packet = req.query;
        
        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const projectID = packet.projectID;

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

        const has = await utils.UserManager.hasLovedProject(projectID, id);

        return res.send({ hasLoved: has });
    });
}