module.exports = (app, utils) => {
    app.post('/api/v1/projects/uploadProject', utils.upload.fields([
        { name: 'jsonFile', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
        // assets
        { name: 'assets', maxCount: utils.MAXASSETS }
    ]), async (req, res) => {
        const packet = req.body;

        if (!await utils.UserManager.loginWithToken(packet.username, packet.password)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (req.files.assets.length > utils.MAXASSETS) {
            return utils.error(res, 400, "Too many assets");
        }

        if (req.files.assets.length !== packet.assets.length) {
            return utils.error(res, 400, "Assets count mismatch");
        }

        // the jsonfile is in protobuf format so convert it to json
        const jsonFile = utils.projectProto.decode(req.files.jsonFile[0]).toJSON()

        const thumbnail = req.files.thumbnail[0];

        // get the assets and their ids
        const assets = [];

        for (let i = 0; i < req.files.assets.length; i++) {
            const asset = req.files.assets[i];
            const id = packet.assets[i];
            assets.push({id: id, buffer: asset});
        }

        // upload the project
        utils.UserManager.publishProject(
            jsonFile,
        );
    });
}