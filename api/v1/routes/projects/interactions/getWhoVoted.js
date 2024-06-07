export default (app, utils) => {
    app.get('/api/v1/projects/getWhoVoted', async (req, res) => {
        const packet = req.query;
        
        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const page = packet.page;

        const projectID = packet.projectID;

        if (!username || !token || !projectID || !page) {
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

        const votes = await utils.UserManager.getWhoVoted(projectID, page, Number(utils.env.PageSize));

        // convert to usernames
        const usernames = [];
        for (const vote of votes) {
            const username = await utils.UserManager.getUsernameByID(vote);
            usernames.push(username);
        }

        return res.send({ loves: usernames });
    });
}