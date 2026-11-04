/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/getmyfeed",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const username = req.login.username;

            const feed = await utils.UserManager.getUserFeed(
                username,
                Number(utils.env.FeedSize),
            );

            const final = [];

            // TODO: do this in the db request
            // TODO: at a minimum this should be an array of promises that we Promise.all
            for (const item of feed) {
                switch (item.type) {
                    case "follow":
                        item.data = {
                            id: item.data,
                            username: await utils.UserManager.getUsernameByID(
                                item.data,
                            ),
                        };
                        final.push(item);
                        break;
                    case "upload":
                    case "remix":
                        item.data = {
                            id: item.data,
                            name: (
                                await utils.UserManager.getProjectMetadata(
                                    item.data,
                                )
                            ).title,
                        };
                        final.push(item);
                        break;
                    default:
                        final.push(item);
                        break;
                }
            }

            res.status(200).json({ feed: final });
        },
    );
};
