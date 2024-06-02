module.exports = (app, utils) => {
    app.get('/api/v1/users/getmyfeed', async function (req, res) {
        const packet = req.query;


        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        const feed = (await utils.UserManager.getUserFeed(username, Number(utils.env.FeedSize)))
        
        const final = []

        for (const item of feed) {
            switch (item.type) {
                case "follow":
                    item.user = {
                        id: item.userID,
                        username: await utils.UserManager.getUsernameByID(item.userID)
                    }
                    item.data = {
                        id: item.data,
                        username: await utils.UserManager.getUsernameByID(item.data)
                    }
                    final.push(item);
                    break;
                case "upload":
                default:
                    final.push(item);
                    break;
            }
        }

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ feed: final });
    });
}