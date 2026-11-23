import "dotenv/config";
import "colors";

import cors from "cors";
import rateLimit from "express-rate-limit";
import express from "express";

import endpointLoader from "./api/endpointLoader";
import UserManager from "./api/v1/db/UserManager";
import Manager from "./api/v1/db/Manager";
import * as logs from "./utils/logs";

import path from "path";
import multer from "multer";
import requestIp from "request-ip";

import { OAuth2Client } from "google-auth-library";
import ipaddr from "ipaddr.js";
import { AuthenticatedRequest } from "./types/express/AuthenticatedRequest";

const app = express();
if (!process.env.PORT) {
    console.warn("unable to read env probably - do you have a .env file?");
}
const PORT = Number(process.env.PORT) || 8080;

const upload = multer({
    dest: "tmp/uploads/",
    limits: {
        fileSize: (Number(process.env.UploadSize) * 1.75 || 5) * 1024 * 1024,
    }, // 5mb - max size per asset
});

const um = new UserManager();
const manager = new Manager();

app.use(
    cors({
        origin: "*", // this gets overwritten by some endpoints (all that use your login)
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    }),
);
app.set("trust proxy", 1);
app.use(
    rateLimit({
        validate: {
            trustProxy: true,
            xForwardedForHeader: true,
        },
        windowMs: 2500, // 300 requests per 2.5 seconds
        limit: 300,
        standardHeaders: "draft-7",
        legacyHeaders: false,
    }),
);
app.use(requestIp.mw());

app.use((req, res, next) => {
    const parsed = ipaddr.process(
        String(
            process.env.isCFTunnel === "true"
                ? req.get("CF-Connecting-IP")
                : req.clientIp,
        ),
    );

    req.realIPPlain = parsed.toString();

    req.realIP =
        parsed instanceof ipaddr.IPv6
            ? parsed.toNormalizedString()
            : parsed.toIPv4MappedAddress().toNormalizedString();

    next();
});
app.use(async (req, res, next) => {
    if (await um.isIPBanned(req.realIP)) {
        return res.status(418).json({ error: "NanananaBooBoo" });
    }
    next();
});
app.use(
    express.json({
        limit: process.env.ServerSize,
    }),
);
app.use(
    express.urlencoded({
        limit: process.env.ServerSize,
        extended: true,
    }),
);

const real_log = console.log;
console.log = (...data) => {
    const date_str = `(${new Date().toISOString()})`.gray.dim;
    real_log(`${"LOG".bgBlack.blue} ${date_str}:`, ...data);
};

const real_warn = console.warn;
console.warn = (...data) => {
    const date_str = `(${new Date().toISOString()})`.gray;
    real_warn(`${"WARNING".bgYellow.white} ${date_str}:`, ...data);
};

const real_error = console.error;
console.error = (...args) => {
    const date_str = `(${new Date().toISOString()})`.gray;

    real_error(
        `${"ERORR".bgRed.white} ${date_str}:`,
        ...args.map((arg) => (arg instanceof Error ? arg.stack : arg)),
    );
};

(async function () {
    await manager.init();

    // TODO: should timezone be dynamic? It's Central because I'm in Central, but thats maybe not amazing practice
    console.log(
        `Starting at ${new Date().toLocaleString("en-US", { timeZone: "CST" })} CST...`
            .green,
    );

    app.get("/robots.txt", (req, res) => {
        res.sendFile(path.join(__dirname, "robots.txt"));
    });

    async function file_size_limit(
        req: AuthenticatedRequest,
        res: express.Response,
        next: express.NextFunction,
    ) {
        const multiplier = req.login.isDonator ? 1.75 : 1;

        const maxSingleSize =
            (Number(process.env.UploadSize) * multiplier || 5) * 1_000_000;

        const maxCombinedSize =
            (Number(process.env.CumulativeUploadSize) * multiplier || 32) *
            1_000_000;

        if (
            !req.files ||
            (Array.isArray(req.files) && req.files.length === 0)
        ) {
            return res.status(400).json({ error: "What??" });
        }

        const files: Express.Multer.File[] = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();

        if (files.length === 0) {
            return res.status(400).json({ error: "What??" });
        }

        let combinedSize = 0;

        for (const file of files) {
            // Individual file size limit
            if (file.size > maxSingleSize) {
                return res.status(400).json({ error: "Asset too big" });
            }

            // Only count jsonFile and assets toward the combined limit.
            // Thumbnail remains excluded, matching your original code.
            if (file.fieldname === "jsonFile" || file.fieldname === "assets") {
                combinedSize += file.size;
            }
        }

        if (combinedSize > maxCombinedSize) {
            return res.status(400).json({ error: "Files too big" });
        }

        return next();
    }

    const utils = {
        UserManager: um,
        homeDir: path.join(__dirname, "./"),
        upload: upload,
        path: path,
        PORT: PORT,
        logs,
        googleOAuth2Client: OAuth2Client,
        ipaddr,
        rateLimiter: rateLimit,
        file_size_limit,
    };

    endpointLoader(app, "v1/routes", utils);

    app.use(function (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) {
        if (err instanceof multer.MulterError) {
            switch (err.code) {
                case "LIMIT_UNEXPECTED_FILE":
                    return res.status(400).json({
                        error: `You have too many files. The maximum amount is ${Number(process.env.MaxFilesUpload)}.`,
                    });
                case "LIMIT_FILE_SIZE":
                default:
                    return res.status(400).json({
                        error: `One of your assets is too large. The maximum size is ${Number(process.env.UploadSize) || 5}mb.`,
                    });
            }
        }

        if (String(err) === "Error: Request aborted") {
            return;
        }

        console.error(
            `Request Error:\n\tMethod: ${req.method}\n\tURL: ${req.originalUrl}`,
        );
        console.error(`error is:`, err);
        res.status(500).json({ error: "InternalError" });
    });

    app.listen(PORT, () => {
        console.log(`API is listening on port ${PORT}`);
    });
})();
