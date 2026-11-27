import type { Application } from "express";
import type { Utils } from "../../../../index";
import { RouteConfig } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

export const endpoint = {
    method: "get",
    path: "/api/v1/ping",
    summary: "Quick server-up check",
    description: "Quick server-up check",
    request: {},
    responses: {
        200: {
            description: "Pong",
            content: {
                "text/plain": {
                    schema: z.literal("Pong!"),
                },
            },
        },
    },
} satisfies RouteConfig;

export default function (app: Application, utils: Utils): void {
    app.get(endpoint.path, function (req, res) {
        res.status(200).send("Pong!");
    });
}
