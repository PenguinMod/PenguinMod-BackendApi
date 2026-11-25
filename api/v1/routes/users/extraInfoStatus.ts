import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/extrainfostatus",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            const user_meta = res.locals.login.fullMeta;

            const birthdayEntered = user_meta.birthdayEntered;
            const countryEntered = user_meta.countryEntered;
            const isEmailVerified = user_meta.emailVerified;

            const user = {
                birthdayEntered,
                countryEntered,
                isEmailVerified,
            };

            res.status(200).json(user);
        },
    );
}
