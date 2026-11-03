/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/requestrankup",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const badges = req.login.badges;

            const rank = req.login.fullMeta.firstLogin;
            if (rank !== 0) {
                utils.error(res, 400, "AlreadyRankedHighest");
                return;
            }

            const user_id = req.login.id;

            const signInDate = req.login.fullMeta.firstLogin;
            // TODO: probably not the best way to do this
            const userProjects = await utils.UserManager.getProjectsByAuthor(
                user_id,
                0,
                3,
                true,
                true,
            );

            const canRequestRankUp =
                (userProjects.length >= 3 && // if we have 3 projects and
                    Date.now() - signInDate >= 4.32e8) || // first signed in 5 days ago
                badges.length > 0; // or we have a badge

            if (!canRequestRankUp) {
                utils.error(res, 403, "Ineligble");
                return;
            }

            const PENGUIN_RANK = 1;
            await utils.UserManager.setRank(req.login.username, PENGUIN_RANK);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ success: true });
        },
    );
};
