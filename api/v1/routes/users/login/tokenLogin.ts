import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

// TODO: we should probably get rid of this endpoint.
// It's more useful if the frontend just fetches a load of data and stores it,
// then can use that instead of making multiple requests

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/tokenlogin",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            res.status(200).json({ success: true });
        },
    );
}
