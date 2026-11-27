import { Application } from "express";
import type { Utils } from "../../../../index";
import { z } from "zod";
import metadata from "../../../../static/metadata.json";
import { RouteConfig } from "@asteasolutions/zod-to-openapi";
metadata.version.git = process.env.GIT_COMMIT ?? "Unknown";

// TODO: store in env whether we're prod and load that in
const MetadataSchema = z
    .object({
        version: z.object({
            git: z.string().meta({
                description:
                    'The commit hash of the most recent commit. If it could not be found, this will be "Unknown"',
            }),
        }),
    })
    .meta({
        id: "ServerMetadata",
        description: "Information about the server",
    });

type Metadata = z.infer<typeof MetadataSchema>;

export const endpoint = {
    method: "get",
    path: "/api/v1/",
    summary: "Get metadata about the server",
    description:
        "Gets metadata about the server. Currently pretty minimal, might be expanded later",
    request: {},
    responses: {
        200: {
            description: "Success",
            content: {
                "application/json": {
                    schema: MetadataSchema,
                },
            },
        },
    },
} satisfies RouteConfig;

export default function (app: Application, utils: Utils): void {
    app.get(endpoint.path, function (req, res) {
        res.status(200).json(MetadataSchema.parse(metadata satisfies Metadata));
    });
}
