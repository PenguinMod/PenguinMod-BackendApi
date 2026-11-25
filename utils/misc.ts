import express from "express";
import fs from "fs/promises";
import cors from "cors";
import disposableDomains from "disposable-email-domains";
import { AuthenticatedRequest } from "../types/express/AuthenticatedRequest";

export function handle_page(page: number): number {
    return Math.max(0, Number(page) || 0);
}

export function unlinkMulter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): void {
    const files = [
        ...(req.file ? [req.file] : []),
        ...(Array.isArray(req.files) ? req.files : []),
        ...(req.files && !Array.isArray(req.files)
            ? Object.values(req.files).flat()
            : []),
    ];

    const paths = files.map((file) => file.path);

    let cleaned = false;

    async function cleanup(): Promise<void> {
        if (cleaned) {
            return;
        }
        cleaned = true;

        await Promise.all(
            paths.map((path) =>
                fs.unlink(path).catch((err) => {
                    if (err.code !== "ENOENT") {
                        console.error("Failed to delete uploaded file:", err);
                    }
                }),
            ),
        );
    }

    res.once("finish", cleanup);
    res.once("close", cleanup);

    next();
}

export function escapeXML(unsafe: string): string {
    return unsafe.replace(/[<>&'"\n]/g, (c): string => {
        switch (c) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&apos;";
            case '"':
                return "&quot;";
            case "\n":
                return "&#10;";
            default:
                return c;
        }
    });
}

export const corsMW = cors({
    origin: function (origin, callback) {
        const whitelist = [process.env.HomeURL, "http://localhost:5173"];
        const idxWebPreview = ".cloudworkstations.dev"; //project idx sigma development
        if (
            !origin ||
            whitelist.indexOf(origin) !== -1 ||
            origin.endsWith(idxWebPreview)
        ) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
});

export async function retryIfFailure<T>(
    todo: () => T | Promise<T>,
    retries: number,
    delay: number,
    onFail: ((arg: unknown) => void) | null = null,
): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await todo();
        } catch (e) {
            if (onFail) {
                onFail(e);
            }
            if (attempt >= retries) {
                console.error("exceeded max retry count");
                throw e;
            }
            console.warn(
                `Try if failed has failed (${attempt + 1}/${retries})`,
            );
            await new Promise((resolve) =>
                setTimeout(resolve, delay * (1 + 0.5 * Math.random())),
            );
        }
    }
}

export interface NeedleMatch {
    needle: string;
    index: number;
    length: number;
}

export function findMatches(
    text: string,
    needles: string[],
    keep: RegExp = /[\p{L}\p{N}]/u,
): NeedleMatch[] {
    const ignoreCase = true;

    const norm = (s: string): string => (ignoreCase ? s.toLowerCase() : s);

    let stripped = "";
    const indexMap: number[] = [];

    let i = 0;
    for (const ch of text) {
        if (keep.test(ch)) {
            const n = norm(ch);
            for (let k = 0; k < n.length; k++) {
                indexMap.push(i);
            }
            stripped += n;
        }
        i += ch.length;
    }

    const results: NeedleMatch[] = [];

    for (const needle of needles) {
        let cleanNeedle = "";
        for (const ch of needle) {
            if (keep.test(ch)) {
                cleanNeedle += norm(ch);
            }
        }
        if (!cleanNeedle) {
            continue;
        }

        let pos = stripped.indexOf(cleanNeedle);
        while (pos !== -1) {
            const start = indexMap[pos];
            const lastIdx = indexMap[pos + cleanNeedle.length - 1];
            const lastCodePoint = text.codePointAt(lastIdx)!;
            const end = lastIdx + (lastCodePoint > 0xffff ? 2 : 1);

            results.push({ needle, index: start, length: end - start });

            // allow overlapping matches
            pos = stripped.indexOf(cleanNeedle, pos + 1);
        }
    }

    return results;
}

export function genHighlightedText(
    text: string,
    needles: NeedleMatch[],
    color: "red" | "yellow",
): string {
    const non_over_needles = [];
    needles = needles.sort((a, b) => b.length - a.length);
    while (needles.length > 0) {
        const cur = needles.pop();
        if (!cur) {
            throw "destroy universe";
        }
        if (needles.length === 0) {
            non_over_needles.push(cur);
            break;
        }
        if (needles[needles.length - 1].index <= cur.index + cur.length) {
            cur.length += needles.pop()?.length || 0;
        }
    }

    let color_code;
    switch (color) {
        case "red":
            color_code = 31;
            break;
        case "yellow":
            color_code = 33;
    }
    const color_start = `\x1b[${color_code};1m`;
    const color_end = "\x1b[0m";

    let res = "";
    let idx = 0;
    for (const needle of non_over_needles) {
        res += text.slice(idx, needle.index);
        res += color_start;
        res += text.slice(needle.index, needle.index + needle.length);
        res += color_end;

        idx = needle.index + needle.length;
    }
    res += text;

    return res;
}

export function validateEmail(email: string): boolean {
    if (
        !email.match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        )
    ) {
        return false;
    }

    // TODO: emails should be made lowercase. this is kinda a big issue

    const domain = email.split("@").pop()?.toLowerCase() || "";
    if (disposableDomains.includes(domain)) {
        return false;
    }

    return true;
}

export function escapeRegex(input: string): string {
    return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function file_size_limit(
    req: AuthenticatedRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> {
    const multiplier = req.login.isDonator ? 1.75 : 1;

    const maxSingleSize =
        (Number(process.env.UploadSize) * multiplier || 5) * 1_000_000;

    const maxCombinedSize =
        (Number(process.env.CumulativeUploadSize) * multiplier || 32) *
        1_000_000;

    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        res.status(400).json({ error: "What??" });
        return;
    }

    const files: Express.Multer.File[] = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();

    if (files.length === 0) {
        res.status(400).json({ error: "What??" });
        return;
    }

    let combinedSize = 0;

    for (const file of files) {
        if (file.size > maxSingleSize) {
            res.status(400).json({ error: "Asset too big" });
            return;
        }

        if (file.fieldname === "jsonFile" || file.fieldname === "assets") {
            combinedSize += file.size;
        }
    }

    if (combinedSize > maxCombinedSize) {
        res.status(400).json({ error: "Files too big" });
        return;
    }

    return next();
}
