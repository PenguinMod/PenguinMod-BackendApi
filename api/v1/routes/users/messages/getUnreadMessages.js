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
        "/api/v1/users/getunreadmessages",
        utils.requireAuth(utils.UserManager, { allow_banned: true }),
        async (req, res) => {
            const packet = req.query;

            const page = utils.handle_page(packet.page);

            const id = req.login.id;

            const messages = await utils.UserManager.getUnreadMessages(
                id,
                page,
                Number(utils.env.PageSize),
            );

            const final = [];
            for (const item of messages) {
                switch (item.message.type) {
                    case "followerAdded":
                        item.message = {
                            user: {
                                id: item.message.user,
                                username:
                                    await utils.UserManager.getUsernameByID(
                                        item.message.user,
                                    ),
                            },
                            type: item.message.type,
                        };

                        final.push(item);
                        break;
                    case "projectFeatured":
                        item.message = {
                            project: {
                                id: item.projectID,
                                title: (
                                    await utils.UserManager.getProjectMetadata(
                                        item.projectID,
                                    )
                                ).title,
                            },
                            type: item.message.type,
                        };
                        final.push(item);
                        break;
                    case "reject":
                        if (!item.message.hardReject) {
                            item.message = {
                                project: {
                                    id: item.projectID,
                                    title: (
                                        await utils.UserManager.getProjectMetadata(
                                            item.projectID,
                                        )
                                    ).title,
                                },
                                ...item.message,
                            };
                        } else {
                            item.message.project = {
                                id: item.projectID,
                                title: item.message.title,
                            };
                        }
                        final.push(item);
                        break;
                    case "remix":
                        item.message = {
                            oldProject: {
                                id: item.message.projectID,
                                title: (
                                    await utils.UserManager.getProjectMetadata(
                                        String(item.message.projectID),
                                    )
                                ).title,
                            },
                            newProject: {
                                id: item.projectID,
                                title: (
                                    await utils.UserManager.getProjectMetadata(
                                        String(item.projectID),
                                    )
                                ).title,
                            },
                            type: item.message.type,
                        };
                        final.push(item);
                        break;
                    case "restored":
                        item.message = {
                            project: {
                                id: item.projectID,
                                title: (
                                    await utils.UserManager.getProjectMetadata(
                                        item.projectID,
                                    )
                                ).title,
                            },
                            type: item.message.type,
                        };
                        final.push(item);
                        break;
                    default:
                        final.push(item);
                        break;
                }
            }

            res.header("Content-type", "application/json");
            res.send({ messages: final });
        },
    );
};
