const countryLookup = require("../../../db/country-lookup.json");

module.exports = (app, utils) => {
    app.post("/api/v1/users/createAccount", utils.cors(), utils.rateLimiter({
        validate: {
            trustProxy: true,
            xForwardedForHeader: true,
        },
        windowMs: 10000,  // 1 requests per 10 seconds
        limit: 1,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
    }), async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const real_username = packet.username;
        const password = packet.password;

        const email = packet.email || "";
        const birthday = packet.birthday;
        const countryCode = packet.country;

        const validateEmail = (email) => {
            return email.match(
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
        };
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
        
        if (typeof username !== "string" || typeof password !== "string" || typeof email !== "string") {
            utils.error(res, 400, "Missing username, password, or email");
            return;
        }

        // prevents usernames having unicode & non-scratch limits (since pm projects are built with scratch limits in mind)
        const usernameDoesNotMeetLength = username.length < 3 || username.length > 20;
        const usernameHasIllegalChars = username.match(/[^a-z0-9\-_]/i);
        if (usernameDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthUsername");
            return;
        }
        if (usernameHasIllegalChars) {
            utils.error(res, 400, "InvalidUsername");
            return;
        }

        // only allows ""complex"" passwords (also seperate regexes since regex just needs to go through each letter to find one match)
        const passwordDoesNotMeetLength = packet.password.length < 8 || packet.password.length > 50;
        const passwordMeetsTextInclude = packet.password.match(/[a-z]/) && packet.password.match(/[A-Z]/);
        const passwordMeetsSpecialInclude = packet.password.match(/[0-9]/) && packet.password.match(/[^a-z0-9]/i);
        if (passwordDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthPassword");
            return;
        }
        if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
            utils.error(res, 400, "MissingRequirementsPassword");
            return;
        }

        if (await utils.UserManager.existsByUsername(username, true)) {
            utils.error(res, 400, "AccountExists");
            return;
        }

        if (email) {
            if (!validateEmail(email)) {
                utils.error(res, 400, "InvalidEmail");
                return;
            }
            if (await utils.UserManager.emailInUse(email)) {
                utils.error(res, 400, "EmailInUse");
                return;
            }
        }

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

        let info = await utils.UserManager.createAccount(username, real_username, packet.password, email, parsedBirthday, countryCode, utils, res);

        if (!info) {
            return;
        }

        const token = info[0];
        const id = info[1];

        await utils.UserManager.addIP(username, req.realIP);
        await utils.logs.sendCreationLog(username, id, "", "account");

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "token": token });
    });
}