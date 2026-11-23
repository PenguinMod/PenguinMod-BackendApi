import express from "express";
import fs from "fs/promises";
import cors from "cors";

function handle_page(page: number): number {
    return Math.max(0, Number(page) || 0);
}

function unlinkMulter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) {
    const files = [
        ...(req.file ? [req.file] : []),
        ...(Array.isArray(req.files) ? req.files : []),
        ...(req.files && !Array.isArray(req.files)
            ? Object.values(req.files).flat()
            : []),
    ];

    const paths = files.map((file) => file.path);

    let cleaned = false;

    async function cleanup() {
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

function escapeXML(unsafe: string): string {
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

const corsMW = cors({
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

async function retryIfFailure<T>(
    todo: () => T | Promise<T>,
    retries: number,
    delay: number,
    onFail: ((arg: any) => any) | null = null,
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

export { handle_page, unlinkMulter, escapeXML, corsMW, retryIfFailure };
