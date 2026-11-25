import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { sendRenameLog, watchlist } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/changeUsername",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const newUsername = String(packet.newUsername).toLowerCase();

            if (!newUsername) {
                res.status(400).json({ error: "Missing token or newUsername" });
                return;
            }

            const username = res.locals.login.username;

            if (newUsername === username) {
                return res.status(200).json({ success: true });
            }

            const usernameDoesNotMeetLength =
                newUsername.length < 3 || newUsername.length > 20;
            const usernameHasIllegalChars = newUsername.match(/[^a-z0-9\-_]/i);
            if (usernameDoesNotMeetLength) {
                res.status(400).json({ error: "InvalidLengthUsername" });
                return;
            }
            if (usernameHasIllegalChars) {
                res.status(400).json({ error: "InvalidUsername" });
                return;
            }

            const userData = {
                id: res.locals.login.id,
                oldUsername: res.locals.login.username,
            };
            if (
                await utils.manager.misc.illegalWordingError(
                    newUsername,
                    "username",
                    userData,
                )
            ) {
                // function already errors
                return;
            }

            await utils.manager.misc.maybeIllegalWordingError(
                newUsername,
                "username",
                userData,
            );

            const exists = await utils.manager.users.existsByUsername(
                newUsername,
                true,
            );
            if (exists) {
                res.status(404).json({ error: "UsernameTaken" });
                return;
            }

            const id = res.locals.login.id;

            sendRenameLog(username, newUsername, id);

            if (await utils.manager.users.isOnWatchlist(username)) {
                watchlist.sendUsernameUpdateLog(username, newUsername, id);
            }

            await utils.manager.users.changeUsername(
                username,
                newUsername,
                String(packet.newUsername),
            );

            res.status(200).json({ success: true });
        },
    );
}
