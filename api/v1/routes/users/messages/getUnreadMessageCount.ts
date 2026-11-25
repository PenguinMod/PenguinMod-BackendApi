import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getunreadmessagecount",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            const id = res.locals.login.id;

            let count = await utils.manager.messages.getUnreadMessageCount(id);

            const lastPolicyUpdates =
                await utils.manager.misc.getLastPolicyUpdate();
            const lastPolicyReads = {
                privacyPolicy: res.locals.login.fullMeta.lastPrivacyPolicyRead,
                TOS: res.locals.login.fullMeta.lastTOSRead,
                guidelines: res.locals.login.fullMeta.lastGuidelinesRead,
            };

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
