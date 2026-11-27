import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import {
    ExtReport,
    ProjectIdSchema,
    ReportIdSchema,
    ReportTypeSchema,
    UserIdSchema,
    UsernameSchema,
} from "../../../db/types";
import { ProjectId, UserId } from "../../../db/new-types";
import { RouteConfig } from "@asteasolutions/zod-to-openapi";
import { validate } from "../../../../../utils/validate";
import { z } from "zod";

export const ReportResponseSchema = z
    .object({
        reporter: z.object({
            username: UsernameSchema,
            id: UserIdSchema,
        }),
        target: z.string(),
        targetID: z.union([UserIdSchema, ProjectIdSchema]),
        report: z.string(),
        author: z.string(),
        date: z.number(),
        type: ReportTypeSchema,
        id: ReportIdSchema,
    })
    .meta({
        id: "ReportResponse",
        description:
            "Information about a report, formatted weird because the frontend SUCKS",
    });

export type ReportResponse = z.infer<typeof ReportResponseSchema>;

const querySchema = z.object({
    page: z.coerce.number().int().min(0).default(0).meta({
        description: "Zero-based page number",
        example: 0,
    }),
    type: ReportTypeSchema.optional(),
});

export const endpoint = {
    method: "get",
    path: "/api/v1/reports/getReports",
    summary: "Get reports, optionally filtering by type",
    description:
        "Get recent reports, sorted by time of report. Optionally filter by type of report",
    request: {
        query: querySchema,
        headers: z.object({
            Authorization: z.templateLiteral(["Bearer ", z.string()]),
        }),
    },
    responses: {
        200: {
            description: "Success",
            content: {
                "application/json": {
                    schema: z.object({
                        reports: z.array(ReportResponseSchema),
                    }),
                },
            },
        },
    },
} satisfies RouteConfig;

export default function (app: Application, utils: Utils): void {
    app.get(
        endpoint.path,
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        validate(endpoint.request),
        async function (req, res) {
            const type = res.locals.valid.query.type;
            const page = res.locals.valid.query.page;

            let reports: ExtReport[];

            switch (type) {
                case "project":
                case "user":
                    reports = await utils.manager.reports.getReportsByType(
                        type,
                        page,
                        Number(process.env.PageSize),
                    );
                    break;

                default:
                    reports = await utils.manager.reports.getReports(
                        page,
                        Number(process.env.PageSize),
                    );
            }

            const final: ReportResponse[] = [];

            for (const report of reports) {
                const pushing: ReportResponse = {
                    reporter: report.reporter,
                    target: "",
                    targetID: report.reportee,
                    report: report.reason,
                    author: "",
                    date: report.date,
                    type: report.type,
                    id: report.id,
                };

                // TODO: maybe move this into db query?
                if (pushing.type === "user") {
                    pushing.target =
                        (
                            await utils.manager.users.getUserDataByID(
                                pushing.targetID as UserId,
                            )
                        )?.username || "";
                } else {
                    const metadata =
                        await utils.manager.projects.getProjectMetadata(
                            pushing.targetID as ProjectId,
                        );

                    if (!metadata) {
                        await utils.manager.reports.resolveReport(pushing.id);
                        continue;
                    }

                    pushing.target = metadata.title;
                    pushing.author = metadata.author.username;
                }

                final.push(pushing);
            }

            return res.status(200).json({ reports: final });
        },
    );
}
