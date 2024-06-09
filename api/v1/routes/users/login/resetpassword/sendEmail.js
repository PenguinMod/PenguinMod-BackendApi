module.exports = (app, utils) => {
    app.post("/api/v1/users/resetpassword/sendEmail", utils.rateLimiter({
        validate: {
            trustProxy: true,
            xForwardedForHeader: true,
        },
        windowMs: 1000 * 60 * 60,  // x requests per hour
        limit: 2,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
    }), async (req, res) => {
        const packet = req.body;

        const email = packet.email;

        if (!await utils.UserManager.emailInUse(email)) {
            utils.error(res, 400, "EmailNotFound");
            return;
        }

        const state = await utils.UserManager.generateOAuth2State();

        const username = await utils.UserManager.getUsernameByEmail(email); // just so we can send the email like "Hello, username"

        /*/ 
         * BTODO:
         * Send email here
         * Link should be something like: https://penguinmod.com/resetpassword?state=STATE&email=EMAIL
         * Make sure to include that the link will expire 5 minutes after it's sent, this can be changed later
        /*/

        res.send(200);
        res.header("Content-Type", 'application/json');
        res.send({ url: `https://penguinmod.com/resetpassword?state=${state}&email=${email}` }); // BTODO: once the email sending stuff is done, change this to just res.send({ "success": true });
    });
}