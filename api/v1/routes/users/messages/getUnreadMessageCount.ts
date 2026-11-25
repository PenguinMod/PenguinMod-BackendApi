import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getunreadmessagecount",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            // TODO: use the fullmeta provided by res.locals.login

            const username = res.locals.login.username;
            const id = res.locals.login.id;

            let count = await utils.UserManager.getUnreadMessageCount(id);

            const lastPolicyUpdates =
                await utils.UserManager.getLastPolicyUpdate(username);
            const lastPolicyReads =
                await utils.UserManager.getLastPolicyRead(username);

            const hasReadTOS = lastPolicyReads.TOS >= lastPolicyUpdates.TOS;
            const hasReadPrivacyPolicy =
                lastPolicyReads.privacyPolicy >=
                lastPolicyUpdates.privacyPolicy;
            const hasReadGuidelines =
                lastPolicyReads.guidelines >= lastPolicyUpdates.guidelines;

            count += hasReadTOS ? 0 : 1;
            count += hasReadPrivacyPolicy ? 0 : 1;
            count += hasReadGuidelines ? 0 : 1;

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ count: count });
        },
    );
}
