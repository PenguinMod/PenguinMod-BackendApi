import { parseBirthday, requireAuth } from "../../../../../utils/auth";
import countryLookup from "../../../../../static/country-lookup.json";
import { Application } from "express";
import { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/filloutSafetyDetails",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const birthday = String(packet.birthday);
            const countryCode = String(packet.country);

            const parsedBirthday = parseBirthday(birthday);
            if (birthday && !parsedBirthday) {
                res.status(400).json({ error: "InvalidBirthday" });
                return;
            }
            if (countryCode) {
                if (typeof countryCode !== "string") {
                    res.status(400).json({ error: "InvalidCountry" });
                    return;
                }
                if (!countryLookup.countryCodes.includes(countryCode)) {
                    res.status(400).json({ error: "UnsupportedCountry" });
                    return;
                }
            }

            if (!parsedBirthday && !countryCode) {
                res.status(400).json({ error: "GiveMeSomething" });
                return;
            }

            // ideally people shouldnt just change their birthday or country on a whim
            if (parsedBirthday && res.locals.login.fullMeta.birthdayEntered) {
                res.status(400).json({ error: "AlreadyEnteredBirthday" });
                return;
            }
            if (countryCode && res.locals.login.fullMeta.countryEntered) {
                res.status(400).json({ error: "AlreadyEnteredCountry" });
                return;
            }

            await utils.manager.users.setUserBirthdayAndOrCountry(
                res.locals.login.id,
                parsedBirthday,
                countryCode,
            );

            res.status(200).json({ success: true });
        },
    );
}
