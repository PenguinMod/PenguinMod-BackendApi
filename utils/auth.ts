import { RequestHandler } from "express";
import { Authentication } from "../api/v1/db/Authentication";
import { corsMW } from "./misc";
import { AuthenticatedRequest } from "../types/express/AuthenticatedRequest";

export interface AuthOptions {
    allow_banned?: boolean;
    require_mod?: boolean;
    require_admin?: boolean;
    require_supporter?: boolean;
}

export const requireAuth = (
    auth: Authentication,
    {
        allow_banned = false,
        require_mod = false,
        require_admin = false,
        require_supporter = false,
    }: AuthOptions = {},
): RequestHandler[] => [
    corsMW,

    async (req, res, next): Promise<void> => {
        const header = req.get("Authorization");

        if (!header) {
            res.status(401).json({ error: "MissingAuthHeader" });
            return;
        }

        const [scheme, token] = header.split(" ");

        if (scheme?.toLowerCase() !== "bearer" || !token) {
            res.status(401).json({ error: "InvalidAuthformat" });
            return;
        }

        const login = await auth.loginWithToken(token, allow_banned, true);

        if (!login.success) {
            res.status(401).json({ error: "InvalidToken" });
            return;
        }

        if (
            (require_admin && !login.isAdmin) ||
            (require_mod && !login.isMod)
        ) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        if (require_supporter && !login.isDonator) {
            res.status(401).json({ error: "SupporterRequired" });
            return;
        }

        (req as AuthenticatedRequest).login = login;

        next();
    },
];

export const maybeAuth =
    (
        um: Authentication,
        { allow_banned = false }: Pick<AuthOptions, "allow_banned"> = {},
    ): RequestHandler =>
    async (req, res, next) => {
        const header = req.get("Authorization");

        if (header) {
            const [scheme, token] = header.split(" ");

            if (scheme?.toLowerCase() !== "bearer" || !token) {
                return res.status(401).json({ error: "InvalidAuthformat" });
            }

            const login = await um.loginWithToken(token, allow_banned, true);

            req.login = login.success ? login : null;
        }

        next();
    };
