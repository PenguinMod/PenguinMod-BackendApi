module.exports = (app, utils) => {
    app.get('/api/v1/projects/tojson', async (req, res) => {
        const packet = req.query;

        const id = packet.id;

        const protobuf = await utils.UserManager.getProjectFile(id);

        const json = utils.UserManager.protobufToProjectJson(protobuf);

        res.send(json);
    })
}