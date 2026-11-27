import type { Response, NextFunction } from "express";
import type { z } from "zod";

export function sendValidated<T extends z.ZodType>(
    res: Response,
    next: NextFunction,
    status: number,
    schema: T,
    data: unknown,
): void {
    try {
        const validated = schema.parse(data);
        res.status(status).json(validated);
    } catch (err) {
        next(err);
    }
}
