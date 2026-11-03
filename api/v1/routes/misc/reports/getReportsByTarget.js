/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

const { isValid } = require("ulid");

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/reports/getReportsByTarget",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.query;

            let target = String(packet.target);
            const page = utils.handle_page(packet.page);

            if (!target) {
                return utils.error(res, 400, "Missing target");
            }

            target = isValid(target)
                ? target
                : await utils.UserManager.getIDByUsername(target, false);

            if (!target) {
                return utils.error(res, 404, "InvalidID");
            }

            const reports = await utils.UserManager.getReportsByReportee(
                target,
                page,
                Number(utils.env.PageSize),
            );

            const final = [];

            for (const report of reports) {
                // TODO: getting of the username should be done in the DB query
                const pushing = {
                    reporter: await utils.UserManager.getUsernameByID(
                        report.reporter,
                    ),
                    target: report.reportee,
                    targetID: report.reportee,
                    report: report.reason,
                    date: report.date,
                    type: report.type,
                    id: report.id,
                };

                if (pushing.type === "user") {
                    pushing.target = await utils.UserManager.getUsernameByID(
                        pushing.targetID,
                    );
                } else {
                    pushing.target = (
                        await utils.UserManager.getProjectMetadata(
                            pushing.targetID,
                        )
                    ).title;
                }

                final.push(pushing);
            }

            res.status(200).json({ reports: final });
        },
    );
};
