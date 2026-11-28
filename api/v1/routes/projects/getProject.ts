import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { RouteConfig } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { ExtProjectDataSchema, ProjectIdSchema } from "../../db/types";
import { validate } from "../../../../utils/validate";

const querySchema = z.object({
    requestType: z.enum(["metadata", "protobuf", "assets", "thumbnail"]),
    projectID: ProjectIdSchema,
});

const RuntimeBufferSchema = z.instanceof(Buffer);

const RuntimeAssetsSchema = z.array(
    z.object({
        id: z.string(),
        buffer: RuntimeBufferSchema,
    }),
);

const ServiceUnavailableResponseSchema = z.object({
    error: z.literal("Viewing is disabled"),
});

const NotFoundSchema = z.object({
    error: z.enum(["ProjectNotFound", "ThumbnailNotFound"]),
});

type ServiceErrorBody = z.infer<typeof ServiceUnavailableResponseSchema>;
type NotFoundBody = z.infer<typeof NotFoundSchema>;

const BufferJsonSchema = z.object({
    type: z.literal("Buffer"),
    data: z.array(z.number().int().min(0).max(255)),
});

const AssetsResponseSchema = z.array(
    z.object({
        id: z.string(),
        buffer: BufferJsonSchema,
    }),
);

const BinaryResponseSchema = z.string().openapi({
    type: "string",
    format: "binary",
});

export const endpoint = {
    method: "get",
    path: "/api/v1/projects/getproject",
    summary: "Get a certain piece of data from a project",
    description:
        "Used to get individual parts of a project's data. Can get metadata, protobuf, assets, or thumbnail.",
    request: {
        query: querySchema,
    },
    responses: {
        503: {
            description: "Viewing is disabled",
            content: {
                "application/json": {
                    schema: ServiceUnavailableResponseSchema,
                },
            },
        },
        200: {
            description: "Success",
            content: {
                "application/json": {
                    schema: z.union([
                        ExtProjectDataSchema,
                        AssetsResponseSchema,
                    ]),
                },
                "application/octet-stream": {
                    schema: BinaryResponseSchema,
                },
                "image/webp": {
                    schema: BinaryResponseSchema,
                },
            },
        },
        404: {
            description: "Not found",
            content: {
                "application/json": {
                    schema: NotFoundSchema,
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
                } satisfies ServiceErrorBody);
            }

            const requestType = res.locals.valid.query.requestType;
            const projectID = res.locals.valid.query.projectID;

            const metadata =
                await utils.manager.projects.getProjectMetadata(projectID);
            if (!metadata) {
                return res
                    .status(404)
                    .json({ error: "ProjectNotFound" } satisfies NotFoundBody);
            }

            const is_author =
                res.locals.login &&
                metadata.author.username === res.locals.login.username;
            const is_mod = res.locals.login && res.locals.login.isMod;

            if (
                ((!is_author && !metadata.public) || metadata.hardReject) &&
                !is_mod
            ) {
                return res
                    .status(404)
                    .json({ error: "ProjectNotFound" } satisfies NotFoundBody);
            }

            switch (requestType) {
                case "protobuf": {
                    // views get checked here because projects have to be gotten from here
                    // or projectwrapper but we don't use that rn
                    if (req.clientIp) {
                        await utils.manager.projects.projectView(
                            projectID,
                            req.clientIp,
                        );
                    }

                    const project =
                        await utils.manager.projects.getProjectFile(projectID);

                    return res
                        .status(200)
                        .type("application/octet-stream")
                        .send(RuntimeBufferSchema.parse(project));
                }
                case "assets": {
                    const assets =
                        await utils.manager.projects.getProjectAssets(
                            projectID,
                        );

                    res.header("Cache-Control", "public, max-age=90");

                    return res
                        .status(200)
                        .json(RuntimeAssetsSchema.parse(assets));
                }
                case "thumbnail": {
                    const thumbnail =
                        await utils.manager.projects.getProjectImage(projectID);

                    if (!thumbnail) {
                        return res.status(404).json({
                            error: "ThumbnailNotFound",
                        } satisfies NotFoundBody);
                    }

                    res.status(200);
                    res.header("Content-Type", "image/webp");
                    res.header("Cache-Control", "public, max-age=90");
                    return res.send(RuntimeBufferSchema.parse(thumbnail));
                }

                case "metadata": {
                    return res
                        .status(200)
                        .json(ExtProjectDataSchema.parse(metadata));
                }
            }
        },
    );
}
