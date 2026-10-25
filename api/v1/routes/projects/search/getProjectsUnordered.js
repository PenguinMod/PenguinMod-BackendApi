/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
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
        async (req, res) => {
            const packet = req.query;

            const after = String(packet.after) || undefined;

            const { projects, next } =
                await utils.UserManager.getProjectsUnordered(
                    Number(utils.env.MaxPageSize),
                    after,
                );

            res.status(200);
            res.header("Content-Type", "application/json");
            return res.send({ projects, next });
        },
    );
};
