const fs = require('fs');

module.exports = (app, utils) => {
    app.post('/api/v1/projects/uploadProject', utils.upload.fields([
        { name: 'jsonFile', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
        // assets
        { name: 'assets' }
    ]), async (req, res) => {
        if (!utils.env.UploadingEnabled) {
            await utils.unlinkAsync(req.files.jsonFile[0].path);
            await utils.unlinkAsync(req.files.thumbnail[0].path);
            for (let asset of req.files.assets) {
                await utils.unlinkAsync(asset.path);
            }
            return utils.error(res, 503, "Uploading is disabled");
        }

        const packet = req.query; // because body is used for the files i think

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            await utils.unlinkAsync(req.files.jsonFile[0].path);
            await utils.unlinkAsync(req.files.thumbnail[0].path);
            for (let asset of req.files.assets) {
                await utils.unlinkAsync(asset.path);
            }
            return utils.error(res, 401, "Invalid credentials");
        }

        // make sure its been 8 minutes since last upload
        if (await utils.UserManager.getLastUpload(username) > Date.now() - utils.uploadCooldown) {
            await utils.unlinkAsync(req.files.jsonFile[0].path);
            await utils.unlinkAsync(req.files.thumbnail[0].path);
            for (let asset of req.files.assets) {
                await utils.unlinkAsync(asset.path);
            }
            return utils.error(res, 400, "Uploaded in the last 8 minutes");
        }

        if (!req.files.jsonFile || !req.files.thumbnail || !req.files.assets) {
            await utils.unlinkAsync(req.files.jsonFile[0].path);
            await utils.unlinkAsync(req.files.thumbnail[0].path);
            for (let asset of req.files.assets) {
                await utils.unlinkAsync(asset.path);
            }
            return utils.error(res, 400, "Invalid data");
        }

        utils.UserManager.setLastUpload(username, Date.now());

        // the jsonfile is in protobuf format so convert it to json
        const protobufFile = fs.readFileSync(req.files.jsonFile[0].path);
        let jsonFile;
        try {
            jsonFile = utils.UserManager.protobufToProjectJson(protobufFile);
        } catch (e) {
            await utils.unlinkAsync(req.files.jsonFile[0].path);
            await utils.unlinkAsync(req.files.thumbnail[0].path);
            for (let asset of req.files.assets) {
                await utils.unlinkAsync(asset.path);
            }
            return utils.error(res, 400, "Invalid protobuf file");
        }

        let remix = Number(packet.remix);

        if (remix) {
            console.log(typeof packet.remix);
            if (!await utils.UserManager.projectExists(remix)) {
                await utils.unlinkAsync(req.files.jsonFile[0].path);
                await utils.unlinkAsync(req.files.thumbnail[0].path);
                for (let asset of req.files.assets) {
                    await utils.unlinkAsync(asset.path);
                }
                return utils.error(res, 400, "Remix project does not exist");
            }
        }

        // check the extensions
        const userRank = await utils.UserManager.getRank(username);
        if (userRank < 1) {
            const isUrlExtension = (extId) => {
                if (!jsonFile.extensionURLs) return false;
                return (extId in jsonFile.extensionURLs);
            };

            if (jsonFile.extensions) {
                for (let extension of jsonFile.extensions) {
                    if (isUrlExtension(extension)) { // url extension names can be faked (if not trusted source)
                        let found = false;
                        for (let source of utils.allowedSources) {
                            if (extension.startswith(source)) {
                                found = true;
                            }
                        }
                        if (!found) {
                            await utils.unlinkAsync(req.files.jsonFile[0].path);
                            await utils.unlinkAsync(req.files.thumbnail[0].path);
                            for (let asset of req.files.assets) {
                                await utils.unlinkAsync(asset.path);
                            }
                            return utils.error(res, 400, "Extension not allowed");
                        }
                    }
                    
                    if (!await utils.UserManager.checkExtensionIsAllowed(extension)) {
                        await utils.unlinkAsync(req.files.jsonFile[0].path);
                        await utils.unlinkAsync(req.files.thumbnail[0].path);
                        for (let asset of req.files.assets) {
                            await utils.unlinkAsync(asset.path);
                        }
                        return utils.error(res, 400, "Extension not allowed");
                    }
                }
            }
        }

        if (!packet.title || typeof packet.title !== "string") {
            packet.title = "";
        }

        if (!packet.instructions || typeof packet.instructions !== "string") {
            packet.instructions = "";
        }

        if (!packet.notes || typeof packet.notes !== "string") {
            packet.notes = "";
        }

        if (!remix || typeof remix !== "number") {
            remix = 0;
        }

        if (!packet.rating || typeof packet.rating !== "string") {
            packet.rating = "";
        }

        const thumbnail = fs.readFileSync(req.files.thumbnail[0].path);

        // TODO: use mmmagic to verify this is a valid image

        // get the assets and their ids
        const assets = [];

        for (let i = 0; i < req.files.assets.length; i++) {
            const asset = fs.readFileSync(req.files.assets[i].path);
            const id = req.files.assets[i].originalname;
            assets.push({id: id, buffer: asset});
        }

        // upload the project
        const projectID = await utils.UserManager.publishProject(
            protobufFile,
            assets,
            await utils.UserManager.getIDByUsername(username),
            packet.title,
            thumbnail,
            packet.instructions,
            packet.notes,
            remix,
            packet.rating
        );

        await utils.unlinkAsync(req.files.jsonFile[0].path);
        await utils.unlinkAsync(req.files.thumbnail[0].path);
        for (let asset of req.files.assets) {
            await utils.unlinkAsync(asset.path);
        }

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ id: projectID });
    });
}