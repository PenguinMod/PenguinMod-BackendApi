const countryLookup = require("../../../../../static/country-lookup.json");
/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/filloutSafetyDetails",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const birthday = String(packet.birthday);
            const countryCode = String(packet.country);

            const username = req.login.username;
            const user_meta = req.login.fullMeta;

            const parseBirthday = (birthday) => {
                if (!birthday) {
                    return;
                }
                if (typeof birthday !== "string") {
                    return;
                }
                try {
                    const date = new Date(birthday);
                    if (isNaN(date.getTime())) {
                        return; // invalid format
                    }

                    return date.toISOString();
                } catch {
                    return;
                }
            };

            const parsedBirthday = parseBirthday(birthday); // will be null if not provided
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
                res.status(400).json({ error: "MissingOneField" });
                return;
            }

            // ideally people shouldnt just change their birthday or country on a whim
            if (parsedBirthday && user_meta.birthdayEntered) {
                res.status(400).json({ error: "AlreadyEnteredBirthday" });
                return;
            }
            if (countryCode && user_meta.countryEntered) {
                res.status(400).json({ error: "AlreadyEnteredCountry" });
                return;
            }

            await utils.UserManager.setUserBirthdayAndOrCountry(
                username,
                parsedBirthday,
                countryCode,
            );

            res.status(200).json({ success: true });
        },
    );
};
