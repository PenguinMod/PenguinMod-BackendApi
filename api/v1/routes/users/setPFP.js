const fs = require('fs');
const Magic = require('mmmagic').Magic;
const magic = new Magic();

module.exports = (app, utils) => {
    app.post('/api/v1/users/setpfp', utils.upload.single("picture"), async (req, res) => {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        const pictureName = req.file;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!pictureName) {
            return utils.error(res, 400, "No picture was provided");
        }

        const picture = fs.readFileSync(pictureName);

        const allowedTypes = ["image/png", "image/jpeg"];

        magic.detect(picture, async (err, result) => {
            if (err) {
                return utils.error(res, 400, "Invalid file type");
            }

            if (!allowedTypes.includes(result)) {
                return utils.error(res, 400, "Invalid file type");
            }

            await utils.UserManager.setProfilePicture(username, picture);

            res.status(200);
            res.header("Content-Type", 'application/json');
            res.json({ "success": true });
        });
    });
}