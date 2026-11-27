import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { z } from "zod";
import { validate } from "../../../../utils/validate";
import { sendValidated } from "../../../../utils/validateResponse";
import { ExtProjectDataSchema } from "../../db/types";
import { EndpointDoc } from "../../../../utils/endpointDoc";

const querySchema = z.object({
    page: z.coerce.number().int().min(0).catch(0).meta({
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

const requestSchema = {
    query: querySchema,
};

const GetProjectsResponseSchema = z.array(ExtProjectDataSchema);
const ErrorResponseSchema = z.object({
    error: z.literal("Viewing is disabled"),
});

export const endpoint: EndpointDoc = {
    method: "get",
    path: "/api/v1/projects/getprojects",
    summary: "Get recent projects",
    description: "Returns a paginated list of recent projects.",
    request: requestSchema,
    responses: {
        200: {
            description: "Projects returned successfully",
            schema: GetProjectsResponseSchema,
        },
        503: {
            description: "Project viewing is disabled",
            schema: ErrorResponseSchema,
        },
    },
};

export default function (app: Application, utils: Utils): void {
    app.get(
        endpoint.path,
        maybeAuth(utils.manager.auth),
        validate(requestSchema),
        async function (req, res, next) {
            if (
                !(await utils.manager.misc.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return res.status(503).json(
                    ErrorResponseSchema.parse({
                        error: "Viewing is disabled",
                    }),
                );
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

            return sendValidated(
                res,
                next,
                200,
                GetProjectsResponseSchema,
                projects,
            );
        },
    );
}
