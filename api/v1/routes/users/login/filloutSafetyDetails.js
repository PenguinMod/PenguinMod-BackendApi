const countryLookup = require("../../../db/country-lookup.json");
const UserManager = require("../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post("/api/v1/users/filloutSafetyDetails", utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;
        
        const birthday = packet.birthday;
        const countryCode = packet.country;

        if (typeof token !== "string") {
            utils.error(res, 400, "Missing token");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;
        
        const user_meta = await utils.UserManager.getUserData(username);
        
        const parseBirthday = (birthday) => {
            if (!birthday) return;
            if (typeof birthday !== "string") return;
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
            utils.error(res, 400, "InvalidBirthday");
            return;
        }
        if (countryCode) {
            if (typeof countryCode !== "string") {
                utils.error(res, 400, "InvalidCountry");
                return;
            }
            if (!countryLookup.countryCodes.includes(countryCode)) {
                utils.error(res, 400, "UnsupportedCountry");
                return;
            }
        }
        
        if (!parsedBirthday && !countryCode) {
            utils.error(res, 400, "MissingOneField");
            return;
        }

        // ideally people shouldnt just change their birthday or country on a whim
        if (parsedBirthday && user_meta.birthdayEntered) {
            utils.error(res, 400, "AlreadyEnteredBirthday");
            return;
        }
        if (countryCode && user_meta.countryEntered) {
            utils.error(res, 400, "AlreadyEnteredCountry");
            return;
        }

        await utils.UserManager.setUserBirthdayAndOrCountry(username, parsedBirthday, countryCode);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}