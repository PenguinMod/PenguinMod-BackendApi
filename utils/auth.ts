import { RequestHandler } from "express";
import type { ParsedQs } from "qs";
import { Authentication, Login } from "../api/v1/db/Authentication";
import { corsMW } from "./misc";

export interface AuthOptions {
    allow_banned?: boolean;
    require_mod?: boolean;
    require_admin?: boolean;
    require_supporter?: boolean;
}

type AuthLocals = {
    login: Login;
};

type MaybeAuthLocals = {
    login: Login | null;
};

export type AuthHandler<
    ReqBody = Record<string, unknown>,
    ReqQuery = ParsedQs,
    ResBody = unknown,
    RouteParams = Record<string, string>,
> = RequestHandler<RouteParams, ResBody, ReqBody, ReqQuery, AuthLocals>;

export type MaybeAuthHandler<
    ReqBody = Record<string, unknown>,
    ReqQuery = ParsedQs,
    ResBody = unknown,
    RouteParams = Record<string, string>,
> = RequestHandler<RouteParams, ResBody, ReqBody, ReqQuery, MaybeAuthLocals>;

export const requireAuth = (
    auth: Authentication,
    {
        allow_banned = false,
        require_mod = false,
        require_admin = false,
        require_supporter = false,
    }: AuthOptions = {},
): AuthHandler[] => [
    corsMW as AuthHandler,

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

        const login = await auth.loginWithToken(token, allow_banned);

        if (!login) {
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

        res.locals.login = login;
        next();
    },
];

export const maybeAuth =
    (
        um: Authentication,
        { allow_banned = false }: Pick<AuthOptions, "allow_banned"> = {},
    ): MaybeAuthHandler =>
    async (req, res, next): Promise<void> => {
        const header = req.get("Authorization");

        res.locals.login = null;

        if (!header) {
            next();
            return;
        }

        const [scheme, token] = header.split(" ");

        if (scheme?.toLowerCase() !== "bearer" || !token) {
            res.status(401).json({ error: "InvalidAuthformat" });
            return;
        }

        res.locals.login = await um.loginWithToken(token, allow_banned);

        next();
    };
