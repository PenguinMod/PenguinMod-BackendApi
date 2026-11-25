import { ulid } from "ulid";
import { DBController } from "./DBController";
import Manager from "./Manager";
import { ProjectId, reportId, ReportId, UserId } from "./new-types";
import { ExtReport, Report, ReportType } from "./types";

export class Reports {
    db: DBController;
    manager: Manager;

    constructor(db: DBController, manager: Manager) {
        this.db = db;
        this.manager = manager;
    }

    async report(
        type: ReportType,
        reportee: UserId | ProjectId,
        reason: string,
        reporter: UserId,
    ): Promise<void> {
        await this.db.reports.insertOne({
            type: type,
            reportee: reportee,
            reason: reason,
            reporter: reporter,
            date: Date.now(),
            id: reportId(ulid()),
            resolved: false,
        });
    }

    async getReport(id: ReportId): Promise<Report | null> {
        return await this.db.reports.findOne({ id: id });
    }

    async getReportsByType(
        type: ReportType,
        page: number,
        pageSize: number,
    ): Promise<ExtReport[]> {
        const result = await this.db.reports
            .aggregate<ExtReport>([
                {
                    $match: { type: type, resolved: { $ne: true } },
                },
                {
                    $sort: { date: -1 },
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
                        localField: "reporter",
                        foreignField: "id",
                        as: "reporterInfo",
                    },
                },
                {
                    $addFields: {
                        reporter: {
                            id: "$reporter",
                            username: {
                                $arrayElemAt: ["$reporterInfo.username", 0],
                            },
                        },
                    },
                },
                {
                    $unset: "reporterInfo",
                },
            ])
            .toArray();

        return result;
    }

    async getReportsByReportee(
        reportee: UserId | ProjectId,
        page: number,
        pageSize: number,
    ): Promise<ExtReport[]> {
        const result = await this.db.reports
            .aggregate<ExtReport>([
                {
                    $match: { reportee: reportee, resolved: { $ne: true } },
                },
                {
                    $sort: { date: -1 },
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
                        localField: "reporter",
                        foreignField: "id",
                        as: "reporterInfo",
                    },
                },
                {
                    $addFields: {
                        reporter: {
                            id: "$reporter",
                            username: {
                                $arrayElemAt: ["$reporterInfo.username", 0],
                            },
                        },
                    },
                },
                {
                    $unset: "reporterInfo",
                },
            ])
            .toArray();

        return result;
    }

    async resolveReports(
        type: ReportType,
        id: UserId | ProjectId,
    ): Promise<number> {
        return (
            await this.db.reports.updateMany(
                { id: id, type: type },
                { $set: { resolved: true } },
            )
        ).modifiedCount;
    }

    async getReportsByReporter(
        reporter: UserId,
        page: number,
        pageSize: number,
    ): Promise<Report[]> {
        const result = await this.db.reports
            .aggregate<Report>([
                {
                    $match: { reporter: reporter, resolved: true },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
            ])
            .toArray();

        return result;
    }

    async hasAlreadyReported(
        reporter: UserId,
        reportee: UserId | ProjectId,
    ): Promise<boolean> {
        const result = await this.db.reports.findOne({
            reporter: reporter,
            reportee: reportee,
        });

        return result ? true : false;
    }

    async getReports(page: number, pageSize: number): Promise<ExtReport[]> {
        const result = await this.db.reports
            .aggregate<ExtReport>([
                {
                    $match: { resolved: { $ne: true } },
                },
                {
                    $sort: { date: -1 },
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
                        localField: "reporter",
                        foreignField: "id",
                        as: "reporterInfo",
                    },
                },
                {
                    $addFields: {
                        reporter: {
                            id: "$reporter",
                            username: {
                                $arrayElemAt: ["$reporterInfo.username", 0],
                            },
                        },
                    },
                },
                {
                    $unset: "reporterInfo",
                },
            ])
            .toArray();

        return result;
    }

    async resolveReport(id: ReportId): Promise<boolean> {
        return (
            (
                await this.db.reports.updateOne(
                    { id: id },
                    { $set: { resolved: true } },
                )
            ).modifiedCount > 0
        );
    }
}
