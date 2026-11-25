import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getmyprojects",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const authorID = res.locals.login.id;

            const page = utils.handle_page(packet.page);

            const projects = await utils.UserManager.getProjectsByAuthor(
                authorID,
                page,
                Number(process.env.PageSize),
                true,
                true,
            );

            res.status(200).json(projects);
        },
    );
}
