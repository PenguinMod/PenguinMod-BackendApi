import { Application } from "express";
import { requireAuth } from "../../../../utils/auth";
import { Utils } from "../../../../index";
import { file_size_limit, unlinkMulter } from "../../../../utils/misc";
import { protobufToJson } from "pmp-protobuf";
import { projectId } from "../../db/new-types";
import { sendCreationLog, watchlist } from "../../../../utils/logs";
import { readFileSync } from "fs";
import sharp from "sharp";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/uploadProject",
        ...requireAuth(utils.manager.auth),
        utils.upload.fields([
            { name: "jsonFile", maxCount: 1 },
            { name: "thumbnail", maxCount: 1 },
            // assets
            { name: "assets", maxCount: Number(process.env.MaxFilesUpload) },
        ]),
        file_size_limit,
        unlinkMulter,
        async function (req, res) {
            if (
                !(await utils.manager.misc.getRuntimeConfigItem(
                    "uploadingEnabled",
                ))
            ) {
                return res.status(503).json({ error: "Uploading is disabled" });
            }

            const packet = req.body;

            const username = res.locals.login.username;
            const userid = res.locals.login.id;
            const isDonator = res.locals.login.isDonator;
            const hasModPerms = res.locals.login.isMod;

            const priv = String(packet.private) === "true" && hasModPerms;

            const lastUpload = res.locals.login.fullMeta.lastUpload;
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

            if (!res.locals.login.emailVerified) {
                return res.status(400).json({
                    error: "You must verify your email to upload a project",
                });
            }

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

            const illegalProjectInfo = {
                author: { id: userid, username: username },
            };
            if (
                await utils.manager.misc.illegalWordingError(
                    title,
                    "projectTitle",
                    illegalProjectInfo,
                )
            ) {
                return res.status(400).json({ error: "IllegalWordsUsed" });
            }

            if (
                await utils.manager.misc.illegalWordingError(
                    instructions,
                    "projectInstructions",
                    illegalProjectInfo,
                )
            ) {
                return res.status(400).json({ error: "IllegalWordsUsed" });
            }

            if (
                await utils.manager.misc.illegalWordingError(
                    notes,
                    "projectNotes",
                    illegalProjectInfo,
                )
            ) {
                return res.status(400).json({ error: "IllegalWordsUsed" });
            }

            if (
                !req.files ||
                Array.isArray(req.files) ||
                !req.files.jsonFile ||
                !req.files.thumbnail ||
                !req.files.assets
            ) {
                return res
                    .status(400)
                    .json({ error: "Missing json file, thumbnail, or assets" });
            }

            // the jsonfile is in protobuf format so convert it to json
            const protobufFile = readFileSync(req.files.jsonFile[0].path);
            let jsonFile;
            try {
                jsonFile = protobufToJson(protobufFile);
            } catch (e) {
                const message =
                    e instanceof Error
                        ? e.message
                        : e && typeof e === "object" && "message" in e
                          ? e.message
                          : e;
                return res.status(400).json({
                    error: `Invalid protobuf file: ${message}`,
                });
            }

            const remix_string =
                !packet.remix ||
                String(packet.remix) === "0" ||
                String(packet.remix) === "undefined"
                    ? ""
                    : String(packet.remix);
            const remix = projectId(remix_string);
            let original_remix_project = null;
            if (remix) {
                original_remix_project =
                    await utils.manager.projects.getProjectMetadata(remix);
                if (
                    !original_remix_project ||
                    !original_remix_project.public ||
                    original_remix_project.hardReject
                ) {
                    return res
                        .status(400)
                        .json({ error: "Remix project does not exist" });
                }
            }

            if (res.locals.login.rank < 1 && !res.locals.login.isMod) {
                const illegalExtensions =
                    await utils.manager.projects.validateAreProjectExtensionsAllowed(
                        jsonFile.extensions || [],
                        jsonFile.extensionURLs || {},
                    );
                if (illegalExtensions.length > 0) {
                    return res.status(400).json({
                        error: `ExtensionsNotAllowed`,
                        extensions: illegalExtensions,
                    });
                }
            }

            if (!packet.rating || typeof packet.rating !== "string") {
                packet.rating = "";
            }

            const unsized_thumbnail = readFileSync(req.files.thumbnail[0].path);

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
                const asset = readFileSync(req.files.assets[i].path);
                const id = req.files.assets[i].originalname;
                assets.push({ id: id, buffer: asset });
            }

            const projectID = await utils.manager.projects.publishProject(
                protobufFile,
                assets,
                userid,
                res.locals.login.rank,
                title,
                thumbnail,
                instructions,
                notes,
                remix,
                String(packet.rating),
                priv,
            );

            if (!projectID) {
                return res.status(503).json({ error: "NoProjectID" });
            }

            const projectInfo = {
                id: projectID,
                author: illegalProjectInfo.author,
            };
            await utils.manager.misc.maybeIllegalWordingError(
                title,
                "projectTitle",
                projectInfo,
            );
            await utils.manager.misc.maybeIllegalWordingError(
                instructions,
                "projectInstructions",
                projectInfo,
            );
            await utils.manager.misc.maybeIllegalWordingError(
                notes,
                "projectNotes",
                projectInfo,
            );

            sendCreationLog(username, projectID, title, "upload", 0x4a7fb5);

            if (res.locals.login.fullMeta.onWatchlist) {
                watchlist.sendProjectUploadLog(projectID, title, username);
            }

            await utils.manager.users.setLastUpload(
                res.locals.login.id,
                Date.now(),
            );

            if (original_remix_project && !priv) {
                const original_creator = original_remix_project.author.id;

                await utils.manager.messages.sendMessage(
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
}
