const fs = require("fs");
const sharp = require("sharp");

/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/uploadProject",
        utils.requireAuth(utils.UserManager),
        utils.upload.fields([
            { name: "jsonFile", maxCount: 1 },
            { name: "thumbnail", maxCount: 1 },
            // assets
            { name: "assets", maxCount: Number(process.env.MaxFilesUpload) },
        ]),
        utils.file_size_limit(utils),
        utils.unlinkMulter,
        async (req, res) => {
            if (
                !(await utils.UserManager.getRuntimeConfigItem(
                    "uploadingEnabled",
                ))
            ) {
                return res.status(503).json({ error: "Uploading is disabled" });
            }

            const packet = req.body;

            const username = req.login.username;
            const userid = req.login.id;
            const isDonator = req.login.isDonator;
            const hasModPerms = req.login.isMod;

            const priv = String(packet.private) === "true" && hasModPerms;

            const lastUpload = await utils.UserManager.getLastUpload(username);
            const now = Date.now();
            const tooSoon = isDonator
                ? lastUpload > now - 10 * 1000
                : lastUpload >
                  now - (Number(process.env.UploadCooldown) || 1000 * 60 * 8);
            if (tooSoon && !hasModPerms && !isDonator) {
                return res
                    .status(400)
                    .json({ error: "Uploaded in the last 8 minutes" });
            }

            if (!req.login.emailVerified) {
                return res.status(400).json({
                    error: "You must verify your email to upload a project",
                });
            }

            const illegalWordingError = async (text, type) => {
                const trigger =
                    await utils.UserManager.checkForIllegalWording(text);
                if (trigger) {
                    res.status(400).json({ error: "IllegalWordsUsed" });

                    const illegalWordIndex =
                        await utils.UserManager.getIndexOfIllegalWording(text);

                    const before = text.substring(0, illegalWordIndex[0]);
                    const after = text.substring(illegalWordIndex[1]);
                    const illegalWord = text.substring(
                        illegalWordIndex[0],
                        illegalWordIndex[1],
                    );

                    utils.logs.sendHeatLog(
                        before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                        trigger,
                        type,
                        [userid, username],
                    );

                    return true;
                }
                return false;
            };

            const potentiallyIllegalWordingError = async (text, type, id) => {
                const trigger =
                    await utils.UserManager.checkForPotentiallyIllegalWording(
                        text,
                    );
                if (trigger) {
                    const illegalWordIndex =
                        await utils.UserManager.getIndexOfPotentiallyIllegalWording(
                            text,
                        );

                    const before = text.substring(0, illegalWordIndex[0]);
                    const after = text.substring(illegalWordIndex[1]);
                    const illegalWord = text.substring(
                        illegalWordIndex[0],
                        illegalWordIndex[1],
                    );

                    utils.logs.sendHeatLog(
                        before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                        trigger,
                        type,
                        [id, username],
                        0xffbb00,
                    );
                    return true;
                }
                return false;
            };

            const title = String(packet.title);
            const instructions = String(packet.instructions);
            const notes = String(packet.notes);

            if (
                title.length > 100 ||
                instructions.length > 4096 ||
                notes.length > 4096
            ) {
                return res.status(400).json({
                    error: "title, instructions, or notes are too long",
                });
            }

            if (await illegalWordingError(title, "projectTitle")) {
                return;
            }

            if (
                await illegalWordingError(instructions, "projectInstructions")
            ) {
                return;
            }

            if (await illegalWordingError(notes, "projectNotes")) {
                return;
            }

            if (
                !req.files.jsonFile ||
                !req.files.thumbnail ||
                !req.files.assets
            ) {
                return res
                    .status(400)
                    .json({ error: "Missing json file, thumbnail, or assets" });
            }

            // the jsonfile is in protobuf format so convert it to json
            const protobufFile = fs.readFileSync(req.files.jsonFile[0].path);
            let jsonFile;
            try {
                jsonFile =
                    utils.UserManager.protobufToProjectJson(protobufFile);
            } catch (e) {
                return res.status(400).json({
                    error: `Invalid protobuf file: ${e.message ?? e}`,
                });
            }

            let remix = String(packet.remix);

            if (remix !== "0") {
                if (!(await utils.UserManager.projectExists(remix))) {
                    return res
                        .status(400)
                        .json({ error: "Remix project does not exist" });
                }
            }

            const [areExtensionsAllowed, blockedExtension] =
                await utils.UserManager.validateAreProjectExtensionsAllowed(
                    jsonFile.extensions,
                    jsonFile.extensionURLs,
                    req.login,
                );
            if (!areExtensionsAllowed) {
                return res.status(400).json({
                    error: `Extension not allowed: ${blockedExtension}`,
                });
            }

            if (!remix || typeof remix !== "string") {
                remix = "0";
            }

            if (!packet.rating || typeof packet.rating !== "string") {
                packet.rating = "";
            }

            const unsized_thumbnail = fs.readFileSync(
                req.files.thumbnail[0].path,
            );

            let thumbnail;
            try {
                thumbnail = await sharp(unsized_thumbnail)
                    .resize(240, 180)
                    .webp()
                    .toBuffer();
            } catch (e) {
                return res.status(400).json({ error: "Invalid image" });
            }

            // TODO: use mmmagic to verify this is a valid image

            const assets = [];

            for (let i = 0; i < req.files.assets.length; i++) {
                const asset = fs.readFileSync(req.files.assets[i].path);
                const id = req.files.assets[i].originalname;
                assets.push({ id: id, buffer: asset });
            }

            const projectID = await utils.UserManager.publishProject(
                protobufFile,
                assets,
                userid,
                req.login.rank,
                title,
                thumbnail,
                instructions,
                notes,
                remix,
                packet.rating,
                priv,
            );

            if (!projectID) {
                return res.status(503).json({ error: "NoProjectID" });
            }

            await potentiallyIllegalWordingError(
                title,
                "projectTitle",
                projectID,
            );
            await potentiallyIllegalWordingError(
                instructions,
                "projectInstructions",
                projectID,
            );
            await potentiallyIllegalWordingError(
                notes,
                "projectNotes",
                projectID,
            );

            utils.logs.sendCreationLog(
                username,
                projectID,
                title,
                "upload",
                0x4a7fb5,
            );

            if (await utils.UserManager.isOnWatchlist(username)) {
                utils.logs.watchlist.sendProjectUploadLog(
                    projectID,
                    title,
                    username,
                );
            }

            await utils.UserManager.setLastUpload(username, Date.now());

            if (remix !== "0" && !priv) {
                const originalProject =
                    await utils.UserManager.getProjectMetadata(remix);

                const original_creator = originalProject.author.id;

                await utils.UserManager.sendMessage(
                    original_creator,
                    {
                        type: "remix",
                        projectID: remix,
                    },
                    false,
                    projectID,
                );
            }

            res.status(200).json({ id: projectID });
        },
    );
};
