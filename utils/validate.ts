import type { RequestHandler } from "express";
import type { ParsedQs } from "qs";
import type { z, ZodType } from "zod";

export interface RouteSchemas {
    params?: ZodType;
    query?: ZodType;
    body?: ZodType;
}

export type Valid<S extends RouteSchemas> = {
    [K in keyof S]: S[K] extends ZodType ? z.output<S[K]> : never;
};

export type ValidLocals<S extends RouteSchemas> = {
    valid: Valid<S>;
};

export type ValidHandler<
    S extends RouteSchemas,
    ReqBody = Record<string, unknown>,
    ReqQuery = ParsedQs,
    ResBody = unknown,
    RouteParams = Record<string, string>,
    ExtraLocals extends Record<string, unknown> = Record<string, unknown>,
> = RequestHandler<
    RouteParams,
    ResBody,
    ReqBody,
    ReqQuery,
    ValidLocals<S> & ExtraLocals
>;

export const validate =
    <
        S extends RouteSchemas,
        ExtraLocals extends Record<string, unknown> = Record<string, unknown>,
    >(
        schemas: S,
    ): ValidHandler<
        S,
        Record<string, unknown>,
        ParsedQs,
        unknown,
        Record<string, string>,
        ExtraLocals
    > =>
    (req, res, next): void => {
        const out: Record<string, unknown> = {};

        for (const key of ["params", "query", "body"] as const) {
            const schema = schemas[key];
            if (!schema) {
                continue;
            }

            const result = schema.safeParse(req[key]);
            if (!result.success) {
                const issue = result.error.issues[0];
                const where = issue.path.join(".");
                res.status(400).json({
                    error: where ? `${where}: ${issue.message}` : issue.message,
                    issues: result.error.issues.map((i) => ({
                        path: i.path.join("."),
                        message: i.message,
                    })),
                });
                return;
            }

            out[key] = result.data;
        }

        res.locals.valid = out as Valid<S>;
        next();
    };
