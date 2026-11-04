/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/reports/getReports",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.query;

            const type = String(packet.type);
            const page = utils.handle_page(packet.page);

            const reports = type
                ? await utils.UserManager.getReportsByType(
                      type,
                      page,
                      Number(utils.env.PageSize),
                  )
                : await utils.UserManager.getReports(
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
                    author: "",
                    date: report.date,
                    type: report.type,
                    id: report.id,
                };

                if (pushing.type === "user") {
                    pushing.target = await utils.UserManager.getUsernameByID(
                        pushing.targetID,
                    );
                } else {
                    const metadata = await utils.UserManager.getProjectMetadata(
                        pushing.targetID,
                    );

                    if (!metadata) {
                        await utils.UserManager.resolveReport(pushing.id);
                        continue;
                    }

                    pushing.target = metadata.title;
                    pushing.author = metadata.author.username;
                }

                final.push(pushing);
            }

            res.status(200).json({ reports: final });
        },
    );
};
