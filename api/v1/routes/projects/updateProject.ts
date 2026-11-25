import { Application } from "express";
import { requireAuth } from "../../../../utils/auth";
import { Utils } from "../../../../index";
import { file_size_limit, unlinkMulter } from "../../../../utils/misc";
import { projectId } from "../../db/new-types";
import { readFileSync } from "fs";
import { protobufToJson } from "pmp-protobuf";
import sharp from "sharp";
import { sendCreationLog, watchlist } from "../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/updateProject",
        ...requireAuth(utils.manager.auth),
        utils.upload.fields([
            { name: "jsonFile", maxCount: 1 },
            { name: "thumbnail", maxCount: 1 },
            // assets
            { name: "assets" },
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
            const isDonator = res.locals.login.isDonator;
            const hasModPerms = res.locals.login.isMod;

            // TODO: just use meta
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

            const projectID = projectId(String(packet.projectID));

            const project =
                await utils.manager.projects.getProjectMetadata(projectID);
            if (!project) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            if (
                (project.author.username !== username || project.hardReject) &&
                !hasModPerms
            ) {
                return res.status(403).json({ error: "Unauthorized" });
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

            const projectInfo = {
                projectID,
                username,
                userID: res.locals.login.id,
            };
            if (
                await utils.manager.misc.illegalWordingError(
                    title,
                    "projectTitle",
                    projectInfo,
                )
            ) {
                return res.status(400).json({ error: "IllegalWordsUsed" });
            }

            if (
                await utils.manager.misc.illegalWordingError(
                    instructions,
                    "projectInstructions",
                    projectInfo,
                )
            ) {
                return res.status(400).json({ error: "IllegalWordsUsed" });
            }

            if (
                await utils.manager.misc.illegalWordingError(
                    notes,
                    "projectNotes",
                    projectInfo,
                )
            ) {
                return res.status(400).json({ error: "IllegalWordsUsed" });
            }

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

            // TODO: make this only update, yk, the things that were updated

            if (Array.isArray(req.files)) {
                throw new Error("Somehow req.files is an array. you MORON");
            }

            let uploadData = null;
            if (req.files && req.files.jsonFile) {
                const protobufFile = readFileSync(req.files.jsonFile[0].path);
                let jsonFile;
                try {
                    jsonFile = protobufToJson(protobufFile);
                } catch (e) {
                    return res
                        .status(400)
                        .json({ error: "Invalid protobuf file" });
                }

                if (res.locals.login.rank < 1 && !res.locals.login.isMod) {
                    const [areExtensionsAllowed, blockedExtension] =
                        await utils.manager.projects.validateAreProjectExtensionsAllowed(
                            jsonFile.extensions || [],
                            jsonFile.extensionURLs || {},
                        );
                    if (!areExtensionsAllowed) {
                        return res.status(400).json({
                            error: `Extension not allowed: ${blockedExtension}`,
                        });
                    }
                }

                const assets = [];
                for (let i = 0; i < req.files.assets.length; i++) {
                    const asset = readFileSync(req.files.assets[i].path);
                    const id = req.files.assets[i].originalname;
                    assets.push({ id: id, buffer: asset });
                }

                uploadData = {
                    project: protobufFile,
                    assets: assets,
                };
            }

            if (!packet.rating || typeof packet.rating !== "string") {
                packet.rating = "";
            }

            const unsized_thumbnail = req.files?.thumbnail
                ? readFileSync(req.files.thumbnail[0].path)
                : null;

            // resize
            let thumbnail;
            try {
                thumbnail = unsized_thumbnail
                    ? await sharp(unsized_thumbnail)
                          .resize(240, 180)
                          .webp()
                          .toBuffer()
                    : null;
            } catch (e) {
                return res
                    .status(400)
                    .json({ error: "Invalid thumbnail image" });
            }

            // TODO: use mmmagic to verify this is a valid image

            // upload the project
            const success = await utils.manager.projects.updateProject(
                projectID,
                uploadData,
                title,
                thumbnail,
                instructions,
                notes,
                String(packet.rating),
            );

            if (!success) {
                return res
                    .status(500)
                    .json({ error: "Failed to update project" });
            }

            sendCreationLog(username, projectID, title, "update", 0x3dc2ad);

            if (await utils.manager.users.isOnWatchlist(username)) {
                watchlist.sendProjectUpdateLog(projectID, title, username);
            }

            await utils.manager.users.setLastUpload(username, Date.now());

            res.status(200).json({ success: true });
        },
    );
}
