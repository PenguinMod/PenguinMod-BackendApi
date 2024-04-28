module.exports = (app, utils) => {
    app.get('/api/v1/projects/getVotes', async (req, res) => {
        const packet = req.query;
        
        const projectID = packet.projectID;

        if (!projectID) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const votes = await utils.ProjectManager.getProjectVotes(projectID);

        return res.send({ votes: votes });
    });
}