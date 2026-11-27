import { ZodType } from "zod";
import { RouteSchemas } from "./validate";

export interface EndpointDoc {
    method: "get" | "post";
    path: string;
    summary: string;
    description: string;
    request: RouteSchemas;
    responses: Record<number, { description: string; schema: ZodType }>;
}
