const fs = require('fs');

module.exports = (app, utils) => {
    app.post('/api/v1/projects/updateProject', utils.cors(), utils.upload.fields([
        { name: 'jsonFile', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
        // assets
        { name: 'assets' }
    ]), utils.cumulative_file_size_limit(utils), async (req, res) => {
        const unlink = async () => {
            if (req.files.jsonFile)
            await utils.unlinkAsync(req.files.jsonFile[0].path);
            if (req.files.thumbnail)
            await utils.unlinkAsync(req.files.thumbnail[0].path);
            for (let asset of req.files.assets) {
                await utils.unlinkAsync(asset.path);
            }
        }

        if (!utils.UserManager.getRuntimeConfigItem("uploadingEnabled")) {
            await unlink();
            return utils.error(res, 503, "Uploading is disabled");
        }

        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();

        if (!await utils.UserManager.loginWithToken(username, packet.token)) {
            await unlink();
            return utils.error(res, 401, "Invalid credentials");
        }

        const isAdmin = await utils.UserManager.isAdmin(username);
        const isModerator = await utils.UserManager.isModerator(username);

        if (await utils.UserManager.getLastUpload(username) > Date.now() - utils.uploadCooldown && (!isAdmin && !isModerator)) {
            await unlink();
            return utils.error(res, 400, "Uploaded in the last 8 minutes");
        }

        const projectID = packet.projectID;

        // check if the project exists
        if (!await utils.UserManager.projectExists(projectID)) {
            await unlink();
            return utils.error(res, 400, "Project does not exist");
        }

        const project = await utils.UserManager.getProjectMetadata(projectID);

        if (project.author.username !== username && !isAdmin) {
            await unlink();
            return utils.error(res, 403, "Unauthorized");
        }

        const illegalWordingError = async (text, type) => {
            if (await utils.UserManager.checkForIllegalWording(text)) {
                utils.error(res, 400, "IllegalWordsUsed")
    
                const illegalWordIndex = await utils.UserManager.getIndexOfIllegalWording(text);


                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(illegalWordIndex[0], illegalWordIndex[1]);
    
                utils.logs.sendHeatLog(
                    before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                    type,
                    [projectID, username]
                )
                
                return true;
            }
            return false;
        }

        const slightlyIllegalWordingError = async (text, type) => {
            if (await utils.UserManager.checkForSlightlyIllegalWording(text)) {
                const illegalWordIndex = await utils.UserManager.getIndexOfSlightlyIllegalWording(text);
    
                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(illegalWordIndex[0], illegalWordIndex[1]);
    
                utils.logs.sendHeatLog(
                    before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                    type,
                    username,
                    0xffbb00,
                )
                return true;
            }
            return false;
        }

        let title = packet.title;
        let instructions = packet.instructions;
        let notes = packet.notes;

        if (!title || typeof title !== "string") {
            title = "";
        }

        if (!instructions || typeof instructions !== "string") {
            instructions = "";
        }

        if (!notes || typeof notes !== "string") {
            notes = "";
        }

        if (await illegalWordingError(title, "projectTitle")) {
            await unlink();
            return;
        }

        if (await illegalWordingError(instructions, "projectInstructions")) {
            await unlink();
            return;
        }

        if (await illegalWordingError(notes, "projectNotes")) {
            await unlink();
            return;
        }

        await slightlyIllegalWordingError(title, "projectTitle");
        await slightlyIllegalWordingError(instructions, "projectInstructions");
        await slightlyIllegalWordingError(notes, "projectNotes");

        if (!req.files.jsonFile || !req.files.thumbnail || !req.files.assets) {
            await unlink();
            return utils.error(res, 400, "Missing json file, thumbnail, or assets");
        }

        // ATODO: make this only update, yk, the things that were updated

        // the jsonfile is in protobuf format so convert it to json
        const protobufFile = fs.readFileSync(req.files.jsonFile[0].path);
        let jsonFile;
        try {
            jsonFile = utils.UserManager.protobufToProjectJson(protobufFile);
        } catch (e) {
            await unlink();
            return utils.error(res, 400, "Invalid protobuf file");
        }

        // check the extensions
        const userRank = await utils.UserManager.getRank(username);
        if (userRank < 1) {
            const isUrlExtension = (extId) => {
                if (!jsonFile.extensionURLs) return false;
                return (extId in jsonFile.extensionURLs);
            };

            if (jsonFile.extensions && !isAdmin && !isModerator) {
                for (let extension of jsonFile.extensions) {
                    if (isUrlExtension(extension)) { // url extension names can be faked (if not trusted source)
                        let found = false;
                        for (let source of utils.allowedSources) {
                            if (jsonFile.extensionURLs[extension].startsWith(source)) {
                                found = true;
                            }
                        }
                        if (!found) {
                            await unlink();
                            return utils.error(res, 400, `Extension not allowed: ${extension}`);
                        }
                    }
                    
                    if (!await utils.UserManager.checkExtensionIsAllowed(extension)) {
                        await unlink();
                        return utils.error(res, 400, `Extension not allowed: ${extension}`);
                    }
                }
            }
        }

        if (!packet.remix || typeof packet.remix !== "number") {
            packet.remix = 0;
        }

        if (!packet.rating || typeof packet.rating !== "string") {
            packet.rating = "";
        }

        const thumbnail = fs.readFileSync(req.files.thumbnail[0].path);

        // ATODO: use mmmagic to verify this is a valid image

        // get the assets and their ids
        const assets = [];

        for (let i = 0; i < req.files.assets.length; i++) {
            const asset = fs.readFileSync(req.files.assets[i].path);
            const id = req.files.assets[i].originalname;
            assets.push({id: id, buffer: asset});
        }

        // upload the project
        await utils.UserManager.updateProject(
            projectID,
            protobufFile,
            assets,
            title,
            thumbnail,
            instructions,
            notes,
            packet.rating
        );
        utils.logs.sendCreationLog(username, projectID, title, "update", 0x3DC2AD);
        await utils.UserManager.setLastUpload(username, Date.now());

        await unlink();
        res.send({ success: true });
    });
}