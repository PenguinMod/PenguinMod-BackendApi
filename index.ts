import "dotenv/config";

import colors from "colors/safe";
import cors from "cors";
import rateLimit from "express-rate-limit";
import express from "express";

import Manager from "./api/v1/db/Manager";

import path from "path";
import multer from "multer";
import requestIp from "request-ip";

import ipaddr from "ipaddr.js";
import { registerRoutes } from "./api/v1/routes/routes";

import { openApiDocument } from "./utils/docs";
import swaggerUi from "swagger-ui-express";

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
    if (await manager.users.isIPBanned(req.realIP)) {
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
console.log = (...data): void => {
    const date_str = colors.dim(colors.gray(`(${new Date().toISOString()})`));
    real_log(`${colors.blue(colors.bgBlack("LOG"))} ${date_str}:`, ...data);
};

const real_warn = console.warn;
console.warn = (...data): void => {
    const date_str = colors.gray(`(${new Date().toISOString()})`);
    real_warn(
        `${colors.white(colors.bgYellow("WARNING"))} ${date_str}:`,
        ...data,
    );
};

const real_error = console.error;
console.error = (...args): void => {
    const date_str = colors.gray(`(${new Date().toISOString()})`);

    real_error(
        `${colors.white(colors.bgRed("ERROR"))} ${date_str}:`,
        ...args.map((arg) => (arg instanceof Error ? arg.stack : arg)),
    );
};

app.get("/openapi.json", (req, res) => {
    res.json(openApiDocument);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

export interface Utils {
    manager: Manager;
    upload: multer.Multer;
}

(async function (): Promise<void> {
    await manager.init();

    // TODO: should timezone be dynamic? It's Central because I'm in Central, but thats maybe not amazing practice
    console.log(
        colors.green(
            `Starting at ${new Date().toLocaleString("en-US", { timeZone: "CST" })} CST...`,
        ),
    );

    app.get("/robots.txt", function (req, res) {
        res.sendFile(path.join(__dirname, "static/robots.txt"));
    });

    const utils: Utils = {
        manager,
        upload,
    };

    registerRoutes(app, utils);

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
