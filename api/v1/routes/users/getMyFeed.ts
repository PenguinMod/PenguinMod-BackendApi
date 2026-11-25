import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getmyfeed",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const username = res.locals.login.username;

            const feed = await utils.UserManager.getUserFeed(
                username,
                Number(process.env.FeedSize),
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
}
