import type { Application } from "express";
import type { Utils } from "../../../../index";
import { RouteConfig } from "@asteasolutions/zod-to-openapi";

export const endpoint = {
    method: "get",
    path: "/",
    summary: "Redirects to homepage",
    description: "Redirects to homepage",
    request: {},
    responses: {
        302: {
            description: "Redirect",
        },
    },
} satisfies RouteConfig;

export default function (app: Application, utils: Utils): void {
    app.get(endpoint.path, function (req, res) {
        res.redirect(process.env.HomeURL || "https://penguinmod.com/");
    });
}
