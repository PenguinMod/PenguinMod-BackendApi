import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { handle_page } from "../../../../../utils/misc";

// TODO: delete?

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getunreadmessages",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            const packet = req.query;

            const page = handle_page(packet.page);

            const id = res.locals.login.id;

            const messages = await utils.manager.messages.getUnreadMessages(
                id,
                page,
                Number(process.env.PageSize),
            );

            res.header("Content-type", "application/json");
            res.send({ messages });
        },
    );
}
