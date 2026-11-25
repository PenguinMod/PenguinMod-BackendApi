import { randomInt } from "crypto";
import { DBController } from "./DBController";
import Manager from "./Manager";
import { ProjectId, projectId, UserId } from "./new-types";
import {
    ExtProjectData,
    OldSearchType,
    ProjectData,
    ProjectInteraction,
    SearchInclude,
    Sort,
} from "./types";
import * as mongodb from "mongodb";
import { escapeRegex } from "../../../utils/misc";
import { readFileSync } from "fs";
import path from "path";
import sharp from "sharp";
const deleted_thumb = readFileSync(
    path.join(__dirname, "../../../static/deletedThumbnail.png"),
);
const deleted_thumb_buffer = sharp(deleted_thumb)
    .resize(240, 180)
    .webp()
    .toBuffer();

export class Projects {
    db: DBController;
    manager: Manager;

    proj_id_to_ip_views: Map<ProjectId, Set<string>> = new Map();
    prev_view_reset: number;

    constructor(db_controller: DBController, manager: Manager) {
        this.db = db_controller;
        this.manager = manager;

        this.prev_view_reset = Date.now();
    }

    async publishProject(
        projectBuffer: Buffer,
        assetBuffers: { buffer: Buffer; id: string }[],
        author: UserId,
        author_rank: number,
        title: string,
        imageBuffer: Buffer,
        instructions: string,
        notes: string,
        remix: string,
        rating: string,
        priv: boolean = false,
    ): Promise<ProjectId | null> {
        let id: ProjectId;
        // TODO: replace this with a ulid somehow
        do {
            const start = randomInt(0, 9999999999).toString();
            id = projectId("0".repeat(10 - start.length) + start);
        } while (
            Number(id) === 0 ||
            (await this.db.projects.findOne({ id: id }))
        );

        // we do this first so if something errors, we dont save an invalid project
        await this.db.minioClient.putObject("projects", id, projectBuffer);
        await this.db.minioClient.putObject(
            "project-thumbnails",
            id,
            imageBuffer,
        );
        for (const asset of assetBuffers) {
            const name = `${id}_${asset.id}`;

            if (this.db.using_backblaze) {
                const success = await this.db.saveToBackblaze(
                    name,
                    asset.buffer,
                );
                if (!success) {
                    // TODO: delete the stuff we put in maybe?
                    return null;
                }
            } else {
                // TODO: figure out if theres a way to see if this succeeded
                await this.db.minioClient.putObject(
                    "project-assets",
                    name,
                    asset.buffer,
                );
            }
        }

        await this.db.projects.insertOne({
            id: id,
            author: author,
            title: title,
            instructions: instructions,
            notes: notes,
            remix: remix,
            featured: false,
            views: 0,
            date: Date.now(),
            lastUpdate: Date.now(),
            rating: rating,
            public: !priv,
            softRejected: false,
            hardReject: false,
            hardRejectTime: 0,
            impressions: 0,
            noFeature: false,
            authorRank: author_rank,
            loves: 0,
            votes: 0,
        });

        if (!priv) {
            await this.manager.users.addToFeed(
                author,
                remix !== "0" ? "remix" : "upload",
                id,
            );
        }

        return id;
    }

    async updateProject(
        id: ProjectId,
        data: {
            project: Buffer;
            assets: { id: string; buffer: Buffer }[];
        } | null,
        title: string,
        imageBuffer: Buffer | null,
        instructions: string,
        notes: string,
        rating: string,
    ): Promise<boolean> {
        await this.db.projects.updateOne(
            { id: id },
            {
                $set: {
                    title: title,
                    instructions: instructions,
                    notes: notes,
                    rating: rating,
                    lastUpdate: Date.now(),
                },
            },
        );

        if (imageBuffer !== null) {
            await this.db.minioClient.putObject(
                "project-thumbnails",
                id,
                imageBuffer,
            );
        }

        if (data !== null) {
            await this.db.minioClient.putObject("projects", id, data.project);

            if (this.db.using_backblaze) {
                await this.db.deleteMultipleObjectsBackblaze(id);
            } else {
                await this.db.deleteMultipleObjects("project-assets", id);
            }

            // TODO: instead of doing this just replace the ones that were edited
            // potentially we could just see which ones are new/not in use, since asset ids are meant to be the hash of the file?
            // we'll need to start verifying that the name IS the hash but we need to do that anyways to save on storage space.
            for (const asset of data.assets) {
                const name = `${id}_${asset.id}`;

                if (this.db.using_backblaze) {
                    // TODO: handle when this fails better
                    if (!(await this.db.saveToBackblaze(name, asset.buffer))) {
                        return false;
                    }
                } else {
                    await this.db.minioClient.putObject(
                        "project-assets",
                        name,
                        asset.buffer,
                    );
                }
            }
        }

        return true;
    }

    async projectView(id: ProjectId, ip: string): Promise<void> {
        if (
            this.proj_id_to_ip_views.size >=
                (Number(process.env.MaxViews) || 10000) ||
            Date.now() - this.prev_view_reset >=
                (Number(process.env.ViewResetRate) || 1000 * 60 * 60)
        ) {
            this.proj_id_to_ip_views.clear();
            this.prev_view_reset = Date.now();
        }

        let new_view = true;
        let inner = this.proj_id_to_ip_views.get(id);
        if (!inner) {
            inner = new Set();
            this.proj_id_to_ip_views.set(id, inner);
        } else {
            new_view = inner.has(ip);
        }
        inner.add(ip);

        if (new_view) {
            await this.db.projects.updateOne({ id }, { $inc: { views: 1 } });
        }
    }

    async fixProjectStats(id: ProjectId): Promise<void> {
        const real_votes = await this.db.projectStats
            .find({ projectId: id, type: "vote" })
            .toArray();
        const real_loves = await this.db.projectStats
            .find({ projectId: id, type: "love" })
            .toArray();

        let votes = 0;
        let loves = 0;
        for (const vote of real_votes) {
            const id = vote.userId;
            if (await this.db.users.findOne({ id, permBanned: false })) {
                votes++;
            } else {
                await this.db.projectStats.deleteMany({ userId: id });
            }
        }
        for (const love of real_loves) {
            const id = love.userId;
            if (await this.db.users.findOne({ id, permBanned: false })) {
                loves++;
            } else {
                await this.db.projectStats.deleteMany({ userId: id });
            }
        }

        await this.db.projects.updateOne({ id }, { $set: { loves, votes } });
    }

    async quickProjectCountCheck(
        author_id: UserId,
        at_least: number,
    ): Promise<number> {
        // TODO: this is shitty. is there any better way?
        return (
            await this.db.projects
                .find({ author: author_id, hardReject: false })
                .limit(at_least)
                .toArray()
        ).length;
    }

    async privateAllProjects(user_id: UserId, toggle: boolean): Promise<void> {
        await this.db.projects.updateMany(
            {
                author: user_id,
            },
            {
                $set: {
                    public: !toggle,
                },
            },
        );
    }

    async setCanBeFeatured(
        projectID: ProjectId,
        canBeFeatured: boolean,
    ): Promise<boolean> {
        return (
            (
                await this.db.projects.updateOne(
                    { id: projectID },
                    { $set: { noFeature: !canBeFeatured } },
                )
            ).matchedCount > 0
        );
    }

    async getRemixes(
        id: ProjectId,
        page: number,
        pageSize: number,
    ): Promise<ExtProjectData[]> {
        const aggResult = await this.db.projects
            .aggregate<ExtProjectData>([
                {
                    $match: { remix: id, public: true, softRejected: false },
                },
                {
                    $sort: { lastUpdate: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    // collect author data
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                        fromDonator: {
                            $in: ["donator", "$authorInfo.badges"],
                        },
                    },
                },
                {
                    $unset: ["authorInfo"],
                },
            ])
            .toArray();

        return aggResult;
    }

    async getRecentProjects(
        show_nonranked: boolean,
        page: number,
        pageSize: number,
        user_id: UserId | null,
        reverse: boolean = false,
        remove_blocked: boolean = false,
    ): Promise<ExtProjectData[]> {
        const pipeline: mongodb.Document[] = [
            {
                $match: {
                    softRejected: false,
                    hardReject: false,
                    public: true,
                },
            },
        ];

        if (!show_nonranked) {
            pipeline.push({ $match: { authorRank: { $gt: 0 } } });
        }

        pipeline.push(
            {
                $sort: { lastUpdate: reverse ? 1 : -1 },
            },
            {
                $skip: page * pageSize,
            },
            {
                $limit: pageSize,
            },
        );

        pipeline.push({
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "id",
                as: "authorInfo",
            },
        });

        if (user_id && remove_blocked) {
            pipeline.push(
                {
                    $lookup: {
                        from: "blocking",
                        localField: "author",
                        foreignField: "target",
                        as: "block_info",
                    },
                },
                {
                    $match: {
                        block_info: {
                            $not: {
                                $elemMatch: { blocker: user_id, active: true },
                            },
                        },
                    },
                },
                {
                    $unset: "block_info",
                },
            );
        }

        pipeline.push(
            {
                $skip: page * pageSize,
            },
            {
                $limit: pageSize,
            },
        );

        pipeline.push({
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "id",
                as: "authorInfo",
            },
        });

        pipeline.push(
            {
                $addFields: {
                    author: {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] },
                    },
                    fromDonator: {
                        $in: ["donator", "$authorInfo.badges"],
                    },
                },
            },
            {
                $unset: ["authorInfo"],
            },
        );

        const aggResult = await this.db.projects
            .aggregate<ExtProjectData>(pipeline)
            .toArray();

        return aggResult;
    }

    async getRandomProjects(size: number): Promise<ProjectData[]> {
        const result = await this.db.projects
            .aggregate<ProjectData>([
                {
                    $match: {
                        softRejected: false,
                        hardReject: false,
                        public: true,
                    },
                },
                {
                    $sample: { size },
                },
            ])
            .toArray();

        return result;
    }

    async getProjectsByAuthor(
        author: UserId,
        page: number,
        pageSize: number,
        getPrivate = false,
        getSoftRejected = false,
    ): Promise<ProjectData[]> {
        const match: mongodb.Document = { author: author, hardReject: false };
        if (!getPrivate) {
            match.public = true;
        }
        if (!getSoftRejected) {
            match.softRejected = false;
        }

        return await this.db.projects
            .aggregate<ProjectData>([
                {
                    $match: match,
                },
                {
                    $sort: { lastUpdate: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
            ])
            .toArray();
    }

    async getProjectFile(id: ProjectId): Promise<Buffer> {
        const file = await this.db.readObjectFromBucket("projects", id);

        return file;
    }

    async getProjectImage(id: ProjectId): Promise<Buffer | null> {
        try {
            const file = await this.db.readObjectFromBucket(
                "project-thumbnails",
                id,
            );
            return file;
        } catch (e) {
            return null;
        }
    }

    async getProjectAssets(
        id: ProjectId,
    ): Promise<{ id: string; buffer: Buffer }[] | null> {
        const search_term = `${id}_`;
        const items = this.db.using_backblaze
            ? await this.db.listNamesWithPrefixBackblaze(search_term)
            : await this.db.listWithPrefix("project-assets", search_term);

        const result = [];

        for (const item of items) {
            const file = this.db.using_backblaze
                ? await this.db.downloadFromBackblaze(item)
                : await this.db.readObjectFromBucket("project-assets", item);

            if (!file) {
                return null;
            }

            result.push({ id: item.slice(search_term.length), buffer: file });
        }

        return result;
    }

    async getProjectMetadata(id: ProjectId): Promise<ExtProjectData | null> {
        const project = await this.db.projects.findOne({ id });
        const authorData = await this.db.users.findOne({ id: project?.author });
        if (!authorData || !project) {
            return null;
        }

        const result = {
            ...project,
            fromDonator: authorData.badges.includes("donator"),
            author: {
                id: authorData.id,
                username: authorData.username,
            },
        };

        return result;
    }

    async hasLovedProject(id: ProjectId, userId: UserId): Promise<boolean> {
        const result = await this.db.projectStats.findOne({
            projectId: id,
            userId: userId,
            type: "love",
        });

        return !!result;
    }

    async loveProject(
        id: ProjectId,
        userId: UserId,
        love: boolean,
    ): Promise<void> {
        if (love) {
            await this.db.projectStats.insertOne({
                projectId: id,
                userId: userId,
                type: "love",
            });
            await this.db.projects.updateOne({ id }, { $inc: { loves: 1 } });
        } else {
            await this.db.projectStats.deleteOne({
                projectId: id,
                userId: userId,
                type: "love",
            });
            await this.db.projects.updateOne({ id }, { $inc: { loves: -1 } });
        }
    }

    async getWhoInteracted(
        projectID: ProjectId,
        page: number,
        pageSize: number,
        type: ProjectInteraction,
    ): Promise<{ id: UserId; username: string }[]> {
        const result = (
            await this.db.projectStats
                .aggregate([
                    {
                        $match: { projectId: projectID, type },
                    },
                    {
                        $skip: page * pageSize,
                    },
                    {
                        $limit: pageSize,
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "id",
                            pipeline: [{ $project: { _id: 0, username: 1 } }],
                            as: "user",
                        },
                    },
                    {
                        $addFields: {
                            username: { $arrayElemAt: ["$user.username", 0] },
                        },
                    },
                ])
                .toArray()
        ).map((data) => ({ id: data.userId, username: data.username }));

        return result;
    }

    async hasVotedProject(id: ProjectId, userId: UserId): Promise<boolean> {
        const result = await this.db.projectStats.findOne({
            projectId: id,
            userId: userId,
            type: "vote",
        });

        return !!result;
    }

    async voteProject(
        id: ProjectId,
        userId: UserId,
        vote: boolean,
    ): Promise<void> {
        if (vote) {
            await this.db.projectStats.insertOne({
                projectId: id,
                userId: userId,
                type: "vote",
            });
            await this.db.projects.updateOne({ id }, { $inc: { votes: 1 } });
        } else {
            await this.db.projectStats.deleteOne({
                projectId: id,
                userId: userId,
                type: "vote",
            });
            await this.db.projects.updateOne({ id }, { $inc: { votes: -1 } });
        }
    }

    async getFeaturedProjects(
        page: number,
        pageSize: number,
    ): Promise<ExtProjectData[]> {
        const aggResult = await this.db.projects
            .aggregate<ExtProjectData>([
                {
                    $match: {
                        featured: true,
                        public: true,
                        softRejected: false,
                        hardReject: false,
                    },
                },
                {
                    $addFields: {
                        featureSortDate: { $ifNull: ["$featureDate", "$date"] },
                    },
                },
                {
                    $sort: {
                        featureSortDate: -1,
                    },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    // collect author data
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                        fromDonator: {
                            $in: ["donator", "$authorInfo.badges"],
                        },
                    },
                },
                {
                    $unset: ["authorInfo", "featureSortDate"],
                },
            ])
            .toArray();

        return aggResult;
    }

    async featureProject(id: ProjectId, feature: boolean): Promise<void> {
        await this.db.projects.updateOne(
            { id: id },
            {
                $set: {
                    featured: feature,
                    featureDate: Date.now(),
                },
            },
        );
    }

    async getProjectCount(): Promise<number> {
        const result = await this.db.projects.countDocuments();

        return result;
    }

    async getProjectCountOfUser(user_id: UserId): Promise<number> {
        const result = await this.db.projects.countDocuments({
            author: user_id,
        });

        return result;
    }

    async deleteProject(id: ProjectId): Promise<void> {
        const del_res = await this.db.projects.deleteOne({ id: id });
        if (del_res.deletedCount <= 0) {
            return;
        }

        // remove the loves and votes
        await this.db.projectStats.deleteMany({ projectId: id });

        // remove the project file
        await this.db.minioClient.removeObject("projects", id);
        await this.db.minioClient.removeObject("project-thumbnails", id);

        await this.removeEvilProjectReferences(id);

        if (this.db.using_backblaze) {
            this.db.deleteMultipleObjectsBackblaze(id);
        } else {
            this.db.deleteMultipleObjects("project-assets", id);
        }
    }

    async hardRejectProject(id: ProjectId): Promise<void> {
        await this.db.projects.updateOne(
            { id: id },
            { $set: { hardReject: true, hardRejectTime: new Date() } }, // doesn't need to be separate any more - we don't delete hard reject
        );
    }

    async isHardRejected(id: ProjectId): Promise<boolean | null> {
        const result = await this.db.projects.findOne({ id: id });

        return result ? result.hardReject : null;
    }

    async removeEvilProjectReferences(projectID: ProjectId): Promise<void> {
        // only one remix "parent" will get the notification
        await this.db.messages.deleteOne({
            projectID,
            "message.type": "remix",
        });
        await this.db.userFeed.deleteMany({ data: projectID }); // right now, user feed is just project uploads. so the data field will always be a project id.
    }

    async getProjectsUnordered(
        pageSize: number,
        after: mongodb.ObjectId | null,
        showAll: boolean,
    ): Promise<{ projects: ProjectId[]; next: mongodb.ObjectId | null }> {
        const filter: mongodb.Document = {};

        if (after) {
            filter._id = { $gt: after };
        }

        if (!showAll) {
            filter.public = true;
            filter.softRejected = false;
            filter.hardReject = false;
        }

        const projects = await this.db.projects
            .find(filter, { projection: { _id: 1, id: 1 } })
            .sort({ _id: 1 })
            .limit(pageSize)
            .toArray();

        return {
            projects: projects.map((d) => d.id),
            next:
                projects.length === pageSize
                    ? projects[projects.length - 1]._id
                    : null,
        };
    }

    async projectExists(id: ProjectId, nonPublic: boolean): Promise<boolean> {
        const result = nonPublic
            ? await this.db.projects.findOne({ id })
            : await this.db.projects.findOne({
                  id,
                  public: true,
                  hardReject: false,
              });

        return !!result;
    }

    async addImpressionsMany(project_ids: ProjectId[]): Promise<void> {
        await this.db.projects.updateMany(
            {
                id: {
                    $in: project_ids,
                },
            },
            { $inc: { impressions: 1 } },
        );
    }

    async deleteThumb(project_id: ProjectId): Promise<void> {
        const image_buffer = await deleted_thumb_buffer;
        await this.db.minioClient.putObject(
            "project-thumbnails",
            project_id,
            image_buffer,
        );
    }

    async addImpression(project_id: ProjectId): Promise<void> {
        await this.db.projects.updateOne(
            { id: project_id },
            { $inc: { impressions: 1 } },
        );
    }

    async changeProjectID(
        original_id: ProjectId,
        new_id: ProjectId,
    ): Promise<void> {
        await this.db.projects.updateOne(
            { id: original_id },
            { $set: { id: new_id } },
        );
        await this.db.renameObjectMinio(
            "project-thumbnails",
            original_id,
            new_id,
        );
        await this.db.renameObjectMinio("projects", original_id, new_id);

        const search_term = `${original_id}_`;
        const assets = this.db.using_backblaze
            ? await this.db.listNamesWithPrefixBackblaze(search_term)
            : await this.db.listWithPrefix("project-assets", search_term);
        for (const asset of assets) {
            const asset_id = asset.split("_")[1];

            if (this.db.using_backblaze) {
                await this.db.renameObjectBackblaze(
                    asset,
                    `${new_id}_${asset_id}`,
                );
            } else {
                await this.db.renameObjectMinio(
                    "project-assets",
                    asset,
                    `${new_id}_${asset_id}`,
                );
            }
        }
        await this.db.users.updateMany(
            { favoriteProjectID: original_id },
            { $set: { favoriteProjectID: new_id } },
        );
        await this.db.projectStats.updateMany(
            { projectId: original_id },
            { $set: { projectId: new_id } },
        );
        await this.db.messages.updateMany(
            { type: "upload", "data.id": original_id },
            { $set: { "data.id": new_id } },
        );
        await this.db.projects.updateMany(
            { remix: original_id },
            { $set: { remix: new_id } },
        );
    }

    async almostFeatured(
        page: number,
        pageSize: number,
    ): Promise<ExtProjectData[]> {
        const result = await this.db.projects
            .aggregate<ExtProjectData>([
                {
                    $match: {
                        softRejected: false,
                        hardReject: false,
                        public: true,
                        featured: false,
                        noFeature: { $ne: true },
                    },
                },
                {
                    $sort: { votes: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    // set author to { id: old_.author, username: authorInfo.username }
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                        fromDonator: {
                            $in: ["donator", "$authorInfo.badges"],
                        },
                    },
                },
                {
                    $unset: ["_id", "authorInfo"],
                },
            ])
            .toArray();

        return result;
    }

    async softReject(id: ProjectId, toggle: boolean): Promise<void> {
        // dont change if public as you should still be able to go to it if you have the id
        await this.db.projects.updateOne(
            { id: id },
            { $set: { softRejected: toggle } },
        );
    }

    async privateProject(id: ProjectId, toggle: boolean): Promise<void> {
        await this.db.projects.updateOne(
            { id: id },
            { $set: { public: !toggle } },
        );
    }

    async validateAreProjectExtensionsAllowed(
        extensions: string[],
        extensionURLs: Record<string, string>,
    ): Promise<string[]> {
        const extensionsConfig = await this.db.illegalList.findOne({
            id: "legalExtensions",
        });
        if (extensionsConfig === null) {
            throw new Error("MissingExtensionConfig");
        }

        const illegalExtensions = [];
        for (const extension of extensions) {
            if (extension in extensionURLs) {
                let found = false;
                for (const source of extensionsConfig.items) {
                    if (!source.startsWith("https://")) {
                        continue;
                    }

                    if (extensionURLs[extension].startsWith(source)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    illegalExtensions.push(extension);
                }
            } else if (!extensionsConfig.items.includes(extension)) {
                illegalExtensions.push(extension);
            }
        }

        return illegalExtensions;
    }

    async searchProjectsNew(
        query: string,
        sort: Sort,
        reverse: boolean,
        before: Date | undefined,
        after: Date | undefined,
        remix: ProjectId | undefined,
        featured: boolean | undefined,
        author: UserId | undefined,
        include: SearchInclude,
        page: number,
        page_size: number,
        include_total: boolean = false,
    ): Promise<{ projects: ExtProjectData[]; total?: number }> {
        const rev = reverse ? -1 : 1;

        let expect: mongodb.Document = { softRejected: false, public: true };
        switch (include) {
            case "all":
                expect = {};
                break;

            case "all-allowed":
                break;
            case "unranked":
                expect["authorRank"] = 0;
                break;
            case "ranked":
                expect["authorRank"] = 1;
                break;

            case "rejected":
                expect = { softRejected: true };
                break;
        }

        if (typeof featured === "boolean") {
            expect["featured"] = featured;
        }

        if (author) {
            expect["author"] = author;
        }

        if (remix) {
            expect["remix"] = remix;
        }

        if (before || after) {
            expect["date"] = {};
            if (before) {
                expect["date"]["$lt"] = before.getTime();
            }
            if (after) {
                expect["date"]["$gt"] = after.getTime();
            }
        }

        const pipeline: mongodb.Document[] = [
            {
                $match: {
                    hardReject: false,
                    ...expect,
                    $or: [
                        {
                            title: {
                                $regex: `.*${escapeRegex(query)}.*`,
                                $options: "i",
                            },
                        },
                        {
                            instructions: {
                                $regex: `.*${escapeRegex(query)}.*`,
                                $options: "i",
                            },
                        },
                        {
                            notes: {
                                $regex: `.*${escapeRegex(query)}.*`,
                                $options: "i",
                            },
                        },
                    ],
                },
            },
        ];

        switch (sort) {
            case "newest-update":
                pipeline.push({
                    $sort: { lastUpdate: -1 * rev },
                });
                break;
            case "newest-upload":
                pipeline.push({
                    $sort: { date: -1 * rev },
                });
                break;
            case "views":
                pipeline.push({
                    $sort: { views: -1 * rev },
                });
                break;
            case "loves":
                pipeline.push({
                    $sort: { loves: -1 * rev },
                });
                break;
            case "votes":
                pipeline.push({
                    $sort: { votes: -1 * rev },
                });
                break;
        }

        const projectPipeline = [
            {
                $skip: page * page_size,
            },
            {
                $limit: page_size,
            },
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo",
                },
            },
            {
                // set author to { id: old_.author, username: authorInfo.username }
                $addFields: {
                    author: {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] },
                    },
                    fromDonator: {
                        $in: ["donator", "$authorInfo.badges"],
                    },
                },
            },
            {
                $unset: ["_id", "authorInfo"],
            },
        ];

        if (!include_total) {
            pipeline.push(...projectPipeline);
            return {
                projects: await this.db.projects
                    .aggregate<ExtProjectData>(pipeline)
                    .toArray(),
            };
        }

        pipeline.push({
            $facet: {
                projects: projectPipeline,
                totalCount: [{ $count: "count" }],
            },
        });

        const [result] = await this.db.projects.aggregate(pipeline).toArray();

        return {
            projects: result?.projects ?? [],
            total: result?.totalCount?.[0]?.count ?? 0,
        };
    }

    async searchProjects(
        show_unranked: boolean,
        query: string,
        type: OldSearchType,
        page: number,
        pageSize: number,
        reverse = false,
    ): Promise<ExtProjectData[]> {
        const text_search: object[] = [
            {
                title: {
                    $regex: `.*${escapeRegex(query)}.*`,
                    $options: "i",
                },
            },
        ];

        //if (notes_and_instructions) {
        text_search.push(
            {
                instructions: {
                    $regex: `.*${escapeRegex(query)}.*`,
                    $options: "i",
                },
            },
            {
                notes: {
                    $regex: `.*${escapeRegex(query)}.*`,
                    $options: "i",
                },
            },
        );

        const aggregateList: mongodb.Document[] = [
            {
                $match: {
                    softRejected: false,
                    hardReject: false,
                    public: true,
                    // $text: { $search: query },
                    $or: text_search,
                },
            },
        ];

        if (!show_unranked) {
            aggregateList.push({
                $match: {
                    authorRank: { $gt: 0 },
                },
            });
        }

        const rev = reverse ? -1 : 1;

        switch (type) {
            case "featured":
                aggregateList.push(
                    {
                        $match: { featured: true },
                    },
                    {
                        $sort: { date: -1 * rev },
                    },
                );
                break;
            case "newest":
                aggregateList.push({
                    $sort: { lastUpdate: -1 * rev },
                });
                break;
            case "uploaddate":
                aggregateList.push({
                    $sort: { date: -1 * rev },
                });
                break;
            case "views":
                aggregateList.push({
                    $sort: { views: -1 * rev },
                });
                break;
            case "loves":
                aggregateList.push({
                    $sort: { loves: -1 * rev },
                });
                break;
            case "votes":
                aggregateList.push({
                    $sort: { votes: -1 * rev },
                });
                break;
        }

        aggregateList.push(
            {
                $skip: page * pageSize,
            },
            {
                $limit: pageSize,
            },
        );

        aggregateList.push({
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "id",
                as: "authorInfo",
            },
        });

        aggregateList.push(
            {
                // set author to { id: old_.author, username: authorInfo.username }
                $addFields: {
                    author: {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] },
                    },
                    fromDonator: {
                        $in: ["donator", "$authorInfo.badges"],
                    },
                },
            },
            {
                $unset: ["_id", "authorInfo"],
            },
        );

        const result = await this.db.projects
            .aggregate<ExtProjectData>(aggregateList)
            .toArray();

        return result;
    }
}
