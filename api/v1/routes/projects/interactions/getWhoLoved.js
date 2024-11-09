module.exports = (app, utils) => {
    app.get('/api/v1/projects/getWhoLoved', utils.cors(), async (req, res) => {
        const packet = req.query;
        
        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const page = packet.page;

        const projectID = packet.projectID;

        if (!username || !token || !projectID || !page) {
            return utils.error(res, 400, "Missing username, token, projectID, or page");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "InvalidLogin");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const loves = await utils.UserManager.getWhoLoved(projectID, page, Number(utils.env.PageSize));

        // convert to usernames
        const usernames = [];
        for (const love of loves) {
            const username = await utils.UserManager.getUsernameByID(love);
            usernames.push(username);
        }

        return res.send({ loves: usernames });
    });
}