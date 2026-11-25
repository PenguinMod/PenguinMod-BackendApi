import { Application } from "express";
import { ObjectId } from "mongodb";
import { Utils } from "../../../../../index";
import rateLimit from "express-rate-limit";
import { maybeAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getprojectsunordered",
        rateLimit({
            validate: {
                trustProxy: true,
                xForwardedForHeader: true,
            },
            windowMs: 10000, // 3 requests per second
            limit: 30,
            standardHeaders: "draft-7",
            legacyHeaders: false,
        }),
        maybeAuth(utils.manager.auth),
        async (req, res) => {
            const packet = req.query;

            const after = String(packet.after);

            if (after && !ObjectId.isValid(after)) {
                return res.status(400).json({ error: "InvalidAfter" });
            }

            const { projects, next } =
                await utils.manager.projects.getProjectsUnordered(
                    Number(process.env.MaxPageSize),
                    after ? new ObjectId(after) : null,
                    res.locals.login?.isMod || false,
                );

            res.status(200).json({ projects, next });
        },
    );
}
