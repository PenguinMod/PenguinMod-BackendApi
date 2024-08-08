const fs = require('fs');

module.exports = (app, utils) => {
    app.post('/api/v1/projects/uploadProject', utils.upload.fields([
        { name: 'jsonFile', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
        // assets
        { name: 'assets', maxCount: 500 }
    ]), async (req, res) => {
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
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            await unlink();
            return utils.error(res, 401, "Invalid credentials");
        }

        const isAdmin = await utils.UserManager.isAdmin(username);
        const isModerator = await utils.UserManager.isModerator(username);

        if (await utils.UserManager.getLastUpload(username) > Date.now() - utils.uploadCooldown && (!isAdmin && !isModerator)) {
            await unlink();
            return utils.error(res, 400, "Uploaded in the last 8 minutes");
        }

        // make sure the files arent too big
        const maxCombinedSize = 50 * 1024 * 1024; // 50mb (bytes)
        let combinedSize = 0;

        if (req.files.jsonFile) combinedSize += req.files.jsonFile[0].size;
        if (req.files.thumbnail) combinedSize += req.files.thumbnail[0].size;
        for (let asset of req.files.assets)
            combinedSize += asset.size;

        if (combinedSize > maxCombinedSize) {
            await unlink();
            return utils.error(res, 400, "Files too big");
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
                    username
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

        let title = packet.title
        let instructions = packet.instructions
        let notes = packet.notes

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
            return utils.error(res, 400, "Invalid data");
        }

        // the jsonfile is in protobuf format so convert it to json
        const protobufFile = fs.readFileSync(req.files.jsonFile[0].path);
        let jsonFile;
        try {
            jsonFile = utils.UserManager.protobufToProjectJson(protobufFile);
        } catch (e) {
            await unlink();
            return utils.error(res, 400, "Invalid protobuf file");
        }

        let remix = Number(packet.remix);

        if (remix) {
            if (!await utils.UserManager.projectExists(remix)) {
                await unlink();
                return utils.error(res, 400, "Remix project does not exist");
            }
        }

        // check the extensions
        const userRank = await utils.UserManager.getRank(username);
        if (userRank < 1 && !isAdmin && !isModerator) {
            const isUrlExtension = (extId) => {
                if (!jsonFile.extensionURLs) return false;
                return (extId in jsonFile.extensionURLs);
            };

            if (jsonFile.extensions) {
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

        if (!remix || typeof remix !== "number") {
            remix = 0;
        }

        if (!packet.rating || typeof packet.rating !== "string") {
            packet.rating = "";
        }

        const thumbnail = fs.readFileSync(req.files.thumbnail[0].path);

        // ATODO: use mmmagic to verify this is a valid image

        const userid = await utils.UserManager.getIDByUsername(username);

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
            userid,
            title,
            thumbnail,
            instructions,
            notes,
            remix,
            packet.rating
        );
        await utils.UserManager.setLastUpload(username, Date.now());

        if (remix) {
            await utils.UserManager.sendMessage(
                userid,
                {
                    type: "remix",
                    projectID: remix,
                },
                false,
                projectID
            )
        }

        await unlink();

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ id: projectID });
    });
}