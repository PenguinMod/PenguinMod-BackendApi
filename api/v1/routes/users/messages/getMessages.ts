import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { handle_page } from "../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getmessages",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            const packet = req.query;

            const messages = await utils.manager.messages.getMessages(
                res.locals.login.id,
                handle_page(packet.page),
                Number(process.env.PageSize),
            );

            res.header("Content-type", "application/json");
            res.send({ messages });
        },
    );
}
