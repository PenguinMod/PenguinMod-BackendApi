module.exports = (app, utils) => {
    app.get("/api/v1/users/getpfp", async (req, res) => {
        const packet = req.query;

        const username = packet.username;

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        if (await utils.UserManager.isBanned(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        const pfp = await utils.UserManager.getProfilePicture(username);

        res.status(200);
        res.header("Content-Type", "application/octet-stream");
        res.send(pfp);
    });
}