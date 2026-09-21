const UserManager = require("../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/projects/search-new", async (req, res) => {
        const packet = req.query;

        const tristate = (str) =>
            str === "true" ? true : str === "false" ? false : null;

        const parseDate = (value) => {
            const date = new Date(
                typeof value === "string" && /^\d+$/.test(value)
                    ? Number(value)
                    : value,
            );

            if (Number.isNaN(date.getTime())) {
                return null;
            }

            return date;
        };

        const query = String(packet.q || "");
        const sort = String(packet.sort);
        const valid_sorts = [
            "newest-update",
            "newest-upload",
            "views",
            "votes",
            "loves",
        ];
        if (!valid_sorts.includes(sort)) {
            return utils.error(res, 400, "InvalidSort");
        }
        const reverse = String(packet.reverse) === "true";
        const before = parseDate(String(packet.before));
        const after = parseDate(String(packet.after));
        const remix_target = packet.remix ? String(packet.remix) : null;
        const featured = tristate(String(packet.featured));

        const author = packet.author
            ? await utils.UserManager.getIDByUsername(String(packet.author))
            : null;
        if (author !== null && !author) {
            return utils.error(res, 400, "InvalidAuthorUsername");
        }

        const include_raw = String(packet.include);
        const page = Number(packet.page) || 0;

        const max_page_size = Number(utils.env.PageSize);
        const limit = Number(packet.pageSize) || max_page_size;
        const page_size = Math.min(max_page_size, limit);

        if (page < 0 || page_size < 0) {
            return utils.error(res, 400, "InvalidPageOrPageSize");
        }

        const token = String(packet.token);
        const login = await utils.UserManager.loginWithToken(token);
        const is_mod = login.success && login.isMod;

        const include = is_mod ? "ranked" : include_raw;
        if (is_mod) {
            switch (include_raw) {
                case "all":
                case "all-allowed":
                case "ranked":
                case "unranked":
                case "rejected":
                    break;

                default:
                    return utils.error(res, 400, "InvalidInclude");
            }
        }

        const projects = await utils.UserManager.searchProjectsNew(
            query,
            sort,
            reverse,
            before,
            after,
            remix_target,
            featured,
            author,
            include,
            page,
            page_size,
        );

        for (const project of projects) {
            await utils.UserManager.addImpression(project.id);
        }

        res.status(200);
        res.header({ "Content-Type": "application/json" });
        return res.send(projects);
    });
};
