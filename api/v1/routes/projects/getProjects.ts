import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { z } from "zod";
import { validate } from "../../../../utils/validate";
import { ExtProjectDataSchema } from "../../db/types";
import { RouteConfig } from "@asteasolutions/zod-to-openapi";

const querySchema = z.object({
    page: z.coerce.number().int().min(0).default(0).meta({
        description: "Zero-based page number",
        example: 0,
    }),

    reverse: z
        .stringbool({ truthy: ["true"], falsy: ["false"] })
        .default(false)
        .meta({
            description: "Return oldest projects first",
            example: false,
        }),
});

const SuccessResponseSchema = z.array(ExtProjectDataSchema);
const ErrorResponseSchema = z.object({
    error: z.literal("Viewing is disabled"),
});

type SuccessBody = z.infer<typeof SuccessResponseSchema>;
type ErrorBody = z.infer<typeof ErrorResponseSchema>;

export const endpoint = {
    method: "get",
    path: "/api/v1/projects/getprojects",
    summary: "Get recent projects",
    description: "Returns a paginated list of recent projects.",
    request: {
        query: querySchema,
    },
    responses: {
        200: {
            description: "Projects returned successfully",
            content: {
                "application/json": {
                    schema: SuccessResponseSchema,
                },
            },
        },
        503: {
            description: "Project viewing is disabled",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
} satisfies RouteConfig;

export default function (app: Application, utils: Utils): void {
    app.get(
        endpoint.path,
        maybeAuth(utils.manager.auth),
        validate(endpoint.request),
        async function (req, res) {
            if (
                !(await utils.manager.misc.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return res.status(503).json({
                    error: "Viewing is disabled",
                } satisfies ErrorBody);
            }

            const { page, reverse } = res.locals.valid.query;

            const is_mod = res.locals.login?.isMod || false;

            const projects = await utils.manager.projects.getRecentProjects(
                is_mod,
                page,
                Number(process.env.PageSize),
                null,
                reverse,
            );

            for (const project of projects) {
                await utils.manager.projects.addImpression(project.id);
            }

            return res
                .status(200)
                .json(
                    SuccessResponseSchema.parse(projects satisfies SuccessBody),
                );
        },
    );
}
