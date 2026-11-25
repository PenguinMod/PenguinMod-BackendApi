import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/misc/setProfanityList",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const username = res.locals.login.username;

            const words = packet.json;

            function assertStringArrayRecord(
                value: unknown,
            ): asserts value is Record<string, string[]> {
                if (
                    typeof value !== "object" ||
                    value === null ||
                    Array.isArray(value) ||
                    !Object.values(value).every(
                        (v) =>
                            Array.isArray(v) &&
                            v.every((item) => typeof item === "string"),
                    )
                ) {
                    throw new Error("Invalid record");
                }
            }

            assertStringArrayRecord(words);

            const types = [
                "illegalWords",
                "illegalWebsites",
                "spacedOutWordsOnly",
                "potentiallyUnsafeWords",
                "potentiallyUnsafeWordsSpacedOut",
                "legalExtensions",
                "unsafeUsernames",
                "potentiallyUnsafeUsernames",
            ];
            for (const key in words) {
                if (!types.includes(key)) {
                    res.status(400).json({ error: "Invalid key" });
                    return;
                }
            }

            let diff = "```diff\n";
            const old = await utils.manager.misc.getIllegalWords();
            for (const key in words) {
                const newDiff = words[key].filter(
                    (x) => !old[key as keyof typeof old]?.includes(x),
                );
                const oldDiff = old[key as keyof typeof old].filter(
                    (x) => !words[key].includes(x),
                );

                if (newDiff.length < 1 && oldDiff.length < 1) {
                    continue;
                }

                diff += `### ${key} ###\n`;

                for (const word of newDiff) {
                    diff += `+ ${word}\n`;
                }
                for (const word of oldDiff) {
                    diff += `- ${word}\n`;
                }
            }
            diff += "```";

            for (const key in words) {
                await utils.manager.misc.setIllegalWords(key, words[key]);
            }

            sendAdminLog(
                {
                    action: "Profanity list has been set",
                    content: `${username} set the profanity list`,
                    fields: {
                        Admin: username,
                        Difference: diff,
                    },
                },
                pmUserAuthor(username),
                0x3ddc5b,
            );

            res.status(200).json({ success: true });
        },
    );
}
