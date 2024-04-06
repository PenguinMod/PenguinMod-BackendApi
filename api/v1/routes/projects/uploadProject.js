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
        const protobufFile = req.files.jsonFile[0];
        const jsonFile = utils.UserManager.protobufToProjectJson(protobufFile);

        // check the extensions
        const userRank = await utils.UserManager.getRank(packet.username);
        if (userRank < 1) {
            const isUrlExtension = (extId) => {
                if (!jsonFile.extensionURLs) return false;
                return (extId in jsonFile.extensionURLs);
            };

            for (let extension of jsonFile.extensions) {
                if (isUrlExtension(extension)) { // url extension names can be faked (if not trusted source)
                    for (let source of utils.allowedSources) {
                        if (!projectCodeJSON.extensionURLs[extension].startsWith(source)) {
                            return utils.error(res, 400, "Extension not allowed");
                        }
                    }
                }
                
                if (!await utils.UserManager.checkExtensionIsAllowed(extension)) {
                    return utils.error(res, 400, "Extension not allowed");
                }
            }
        }

        if (!packet.title || typeof packet.title !== "string") {
            return utils.error(res, 400, "Invalid title");
        }

        if (!packet.instructions || typeof packet.instructions !== "string") {
            return utils.error(res, 400, "Invalid instructions");
        }

        if (!packet.notes || typeof packet.notes !== "string") {
            return utils.error(res, 400, "Invalid notes");
        }

        if (!packet.remix || typeof packet.remix !== "number") {
            return utils.error(res, 400, "Invalid remix");
        }

        if (!packet.rating || typeof packet.rating !== "string") {
            return utils.error(res, 400, "Invalid rating");
        }

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
            protobufFile,
            assets,
            await utils.UserManager.getIDByUsername(packet.username),
            packet.title,
            thumbnail,
            packet.instructions,
            packet.notes,
            packet.remix,
            packet.rating
        );
    });
}