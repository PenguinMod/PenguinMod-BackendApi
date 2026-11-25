/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

const { ObjectId } = require("mongodb");

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/projects/getprojectsunordered",
        utils.rateLimiter({
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

            const after = String(packet.after) || undefined;

            if (after && !ObjectId.isValid(after)) {
                return res.status(400).json({ error: "InvalidAfter" });
            }

            const { projects, next } =
                await utils.UserManager.getProjectsUnordered(
                    Number(process.env.MaxPageSize),
                    after,
                    res.locals.login && res.locals.login.isMod,
                );

            res.status(200).json({ projects, next });
        },
    );
};
