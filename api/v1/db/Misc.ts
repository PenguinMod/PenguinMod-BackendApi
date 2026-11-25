import { freemem, totalmem } from "os";
import { DBController } from "./DBController";
import Manager from "./Manager";
import * as mongodb from "mongodb";
import { findMatches, genHighlightedText } from "../../../utils/misc";
import { sendHeatLog } from "../../../utils/logs";

export class Misc {
    db: DBController;
    manager: Manager;

    constructor(db: DBController, manager: Manager) {
        this.db = db;
        this.manager = manager;
    }

    async getWorstOffenders(
        page: number,
        pageSize: number,
    ): Promise<mongodb.Document[]> {
        const time_before = 1000 * 60 * 60 * 24 * 14;

        return await this.db.performance_logging
            .aggregate([
                {
                    $match: {
                        ts: { $gt: new Date(Date.now() - time_before) },
                    },
                },
                {
                    $sort: { millis: -1 },
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

    async getUserStats(): Promise<object> {
        const result = await this.db.users
            .aggregate<{ range: string; count: number }>([
                {
                    $match: { birthdayEntered: true },
                },
                {
                    $addFields: {
                        age: {
                            $dateDiff: {
                                startDate: { $toDate: "$birthday" },
                                endDate: "$$NOW",
                                unit: "year",
                            },
                        },
                    },
                },
                {
                    $bucket: {
                        groupBy: "$age",
                        boundaries: [
                            0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
                            26, 65, 500,
                        ],
                        default: "unknown",
                        output: {
                            count: { $sum: 1 },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        range: {
                            $switch: {
                                branches: [
                                    {
                                        case: { $eq: ["$_id", 0] },
                                        then: "under 5",
                                    },
                                    { case: { $eq: ["$_id", 6] }, then: "6" },
                                    { case: { $eq: ["$_id", 7] }, then: "7" },
                                    { case: { $eq: ["$_id", 8] }, then: "8" },
                                    { case: { $eq: ["$_id", 9] }, then: "9" },
                                    { case: { $eq: ["$_id", 10] }, then: "10" },
                                    { case: { $eq: ["$_id", 11] }, then: "11" },
                                    { case: { $eq: ["$_id", 12] }, then: "12" },
                                    { case: { $eq: ["$_id", 13] }, then: "13" },
                                    { case: { $eq: ["$_id", 14] }, then: "14" },
                                    { case: { $eq: ["$_id", 15] }, then: "15" },
                                    { case: { $eq: ["$_id", 16] }, then: "16" },
                                    { case: { $eq: ["$_id", 17] }, then: "17" },
                                    {
                                        case: { $eq: ["$_id", 18] },
                                        then: "18-25",
                                    },
                                    {
                                        case: { $eq: ["$_id", 26] },
                                        then: "26-64",
                                    },
                                    {
                                        case: { $eq: ["$_id", 65] },
                                        then: "65+",
                                    },
                                ],
                                default: "unknown",
                            },
                        },
                        count: 1,
                    },
                },
            ])
            .toArray();

        const formatted: Record<string, number> = {
            "under 5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
            "13": 0,
            "14": 0,
            "15": 0,
            "16": 0,
            "17": 0,
            "18-25": 0,
            "26-64": 0,
            "65+": 0,
        };

        for (const r of result) {
            if (Object.hasOwn(formatted, r.range)) {
                formatted[r.range] = r.count;
            }
        }

        return formatted;
    }

    async getLastPolicyUpdate(): Promise<Record<string, number>> {
        const out: Record<string, number> = {};

        (await this.db.lastPolicyUpdates.find().toArray()).map((x) => {
            out[x.id] = x.lastUpdate;
        });

        return out;
    }

    async setLastPrivacyPolicyUpdate(): Promise<void> {
        await this.db.lastPolicyUpdates.updateOne(
            { id: "privacyPolicy" },
            { $set: { lastUpdate: Date.now() } },
        );
    }

    async setLastTOSUpdate(): Promise<void> {
        await this.db.lastPolicyUpdates.updateOne(
            { id: "TOS" },
            { $set: { lastUpdate: Date.now() } },
        );
    }

    async setLastGuidelinesUpdate(): Promise<void> {
        await this.db.lastPolicyUpdates.updateOne(
            { id: "guidelines" },
            { $set: { lastUpdate: Date.now() } },
        );
    }

    async getRuntimeConfigItem(id: string): Promise<unknown> {
        const result = await this.db.runtimeConfig.findOne({ id: id });

        if (!result) {
            console.warn(`Couldn't find config item ${id}`);
            return true; // minimize disruptions
        }

        return result.value;
    }

    async setRuntimeConfigItem(id: string, value: unknown): Promise<void> {
        await this.db.runtimeConfig.updateOne({ id: id }, { $set: { value } });
    }

    compMemUsage(): {
        total: number;
        free: number;
        used: number;
        percentage_used: number;
    } {
        const total = totalmem();
        const free = freemem();
        const used = total - free;
        const percentage_used = used / total;
        return {
            total,
            free,
            used,
            percentage_used,
        };
    }
    async getStats(): Promise<{
        userCount: number;
        bannedCount: number;
        projectCount: number;
        remixCount: number;
        featuredCount: number;
        totalViews: number;
    }> {
        const userCount =
            (await this.db.users.countDocuments({ permBanned: false })) || 0;
        const bannedCount =
            (await this.db.users.countDocuments({
                $or: [{ permBanned: true }, { unbanTime: { $gt: Date.now() } }],
            })) || 0;
        const projectCount = (await this.db.projects.countDocuments()) || 0;
        // check if remix is not 0
        const remixCount =
            (await this.db.projects.countDocuments({ remix: { $ne: "0" } })) ||
            0;
        const featuredCount =
            (await this.db.projects.countDocuments({ featured: true })) || 0;
        const totalViewsResult = await this.db.projects
            .aggregate([
                { $match: { views: { $gte: 0 } } },
                { $group: { _id: null, total_views: { $sum: "$views" } } },
            ])
            .toArray();
        const totalViews =
            totalViewsResult.length > 0
                ? totalViewsResult[0].total_views || 0
                : 0;

        /*
        const mongodb_stats = await this.db.command({
            serverStatus: 1,
        });
        const current_mem_usage = process.memoryUsage();
        const comp_mem_usage = this.compMemUsage();
        */

        return {
            userCount,
            bannedCount,
            projectCount,
            remixCount,
            featuredCount,
            totalViews,
            /*
            current_mem_usage,
            comp_mem_usage,
            mongodb_stats,
            */
        };
    }

    async setIllegalWords(type: string, words: string[]): Promise<void> {
        await this.db.illegalList.updateOne(
            { id: type },
            { $set: { items: words } },
        );
    }

    async getIllegalWords(): Promise<{
        illegalWords: string[];
        illegalWebsites: string[];
        spacedOutWordsOnly: string[];
        potentiallyUnsafeWords: string[];
        potentiallyUnsafeWordsSpacedOut: string[];
        legalExtensions: string[];
        unsafeUsernames: string[];
        potentiallyUnsafeUsernames: string[];
    }> {
        const [
            illegalWords,
            illegalWebsites,
            spacedOutWordsOnly,
            potentiallyUnsafeWords,
            potentiallyUnsafeWordsSpacedOut,
            unsafeUsernames,
            potentiallyUnsafeUsernames,
            legalExtensions,
        ] = (
            await Promise.all([
                this.db.illegalList.findOne({ id: "illegalWords" }),
                this.db.illegalList.findOne({ id: "illegalWebsites" }),
                this.db.illegalList.findOne({ id: "spacedOutWordsOnly" }),
                this.db.illegalList.findOne({ id: "potentiallyUnsafeWords" }),
                this.db.illegalList.findOne({
                    id: "potentiallyUnsafeWordsSpacedOut",
                }),
                this.db.illegalList.findOne({ id: "unsafeUsernames" }),
                this.db.illegalList.findOne({
                    id: "potentiallyUnsafeUsernames",
                }),
                this.getLegalExtensions(),
            ])
        ).map((t) => (Array.isArray(t) ? t : t?.items || []));

        return {
            illegalWords,
            illegalWebsites,
            spacedOutWordsOnly,
            potentiallyUnsafeWords,
            potentiallyUnsafeWordsSpacedOut,
            legalExtensions,
            unsafeUsernames,
            potentiallyUnsafeUsernames,
        };
    }

    async getLegalExtensions(): Promise<string[]> {
        const result = await this.db.illegalList.findOne({
            id: "legalExtensions",
        });

        return result?.items || [];
    }

    async getIllegalNeedles(): Promise<string[]> {
        return (
            await Promise.all([
                this.db.illegalList.findOne({ id: "illegalWords" }),
                this.db.illegalList.findOne({ id: "illegalWebsites" }),
            ])
        )
            .filter((item) => item !== null)
            .map((item) => item.items)
            .flat();
    }

    async getMaybeIllegalNeedles(): Promise<string[]> {
        return (
            (
                await this.db.illegalList.findOne({
                    id: "potentiallyUnsafeWords",
                })
            )?.items || []
        );
    }

    // TODO: implement the spaced out words check
    async illegalWordingError(
        text: string,
        location: string,
        extra_terms?: string[],
    ): Promise<boolean> {
        const terms = [
            ...(await this.getIllegalNeedles()),
            ...(extra_terms ?? []),
        ];

        const needles = findMatches(text, terms);

        if (needles.length > 0) {
            const highlighted_text = genHighlightedText(text, needles, "red");
            sendHeatLog(
                highlighted_text,
                needles.map((n) => n.needle),
                location,
            );
        }
        return needles.length > 0;
    }

    // TODO: implement the spaced out words check
    async maybeIllegalWordingError(
        text: string,
        location: string,
        extra_terms?: string[],
    ): Promise<boolean> {
        const terms = [
            ...(await this.getMaybeIllegalNeedles()),
            ...(extra_terms ?? []),
        ];

        const needles = findMatches(text, terms);

        if (needles.length > 0) {
            const highlighted_text = genHighlightedText(
                text,
                needles,
                "yellow",
            );
            sendHeatLog(
                highlighted_text,
                needles.map((n) => n.needle),
                location,
            );
        }
        return needles.length > 0;
    }

    async getAccountsOverTime(
        monthsBack?: number,
    ): Promise<{ month: string; count: number; total: number }[]> {
        const now = new Date();
        const endYear = now.getUTCFullYear();
        const endMonth = now.getUTCMonth() + 1;

        const match: mongodb.Document = {
            firstLogin: { $type: "number" },
            permBanned: false,
        };
        let baseline = 0;
        let year = null;
        let month = null;

        if (monthsBack !== undefined) {
            const startMs = Date.UTC(
                endYear,
                endMonth - 1 - (monthsBack - 1),
                1,
            );
            const startDate = new Date(startMs);
            year = startDate.getUTCFullYear();
            month = startDate.getUTCMonth() + 1;

            baseline = await this.db.users.countDocuments({
                firstLogin: { $type: "int", $lt: startMs },
                permBanned: false,
            });
            match.firstLogin.$gte = startMs;
        }

        const rows = await this.db.users
            .aggregate([
                { $match: match },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: { $toDate: "$firstLogin" },
                                timezone: "UTC",
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ])
            .toArray();

        const counts = new Map(rows.map((r) => [r._id, r.count]));

        if (year === null) {
            if (rows.length === 0) {
                return [];
            }
            [year, month] = rows[0]._id.split("-").map(Number);
        }

        const data = [];
        let total = baseline;
        while (year < endYear || (year === endYear && month <= endMonth)) {
            const key = `${year}-${String(month).padStart(2, "0")}`;
            const count = counts.get(key) || 0;
            total += count;
            data.push({ month: key, count, total });

            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }

        return data;
    }
}
