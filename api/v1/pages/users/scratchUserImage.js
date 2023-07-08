const Enviornment = require("../../../../classes/Enviornment");
const axios = require("axios");
const fs = require("fs");

const CachedScratchUsers = {}
let RequestQueue = 0

const API_URL = 'https://trampoline.turbowarp.org/api/';
const AVATAR_URL = 'https://trampoline.turbowarp.org/avatars/';

const TYPE = "GET";
const FUNC = (req, res) => {
    const username = String(req.query.username);
    if (!username) {
        res.status(400);
        res.json({ "error": "UsernameNotSpecified" });
        return;
    }
    // check if we already cached this user
    // so we dont need to fetch again
    if (CachedScratchUsers[username] != null) {
        const image = CachedScratchUsers[username];
        res.status(200);
        res.contentType('image/png');
        res.send(image);
        return;
    }
    // find cached image if error occurs
    function errorFindCached(err) {
        if (Enviornment.LOG_FAILED) {
            console.log(err);
        }
        fs.readFile(`./cache/${username}.png`, (err, image) => {
            if (err) {
                res.status(500);
                res.json({ "error": err });
                return;
            }
            // image found
            res.status(200);
            res.contentType('image/png');
            res.send(image);
        });
    }
    // make sure we arent spamming
    if (RequestQueue < 0) RequestQueue = 0;
    RequestQueue += 1000;
    setTimeout(() => {
        RequestQueue -= 1000;
        // we are past the queue
        axios.get(`${API_URL}/users/${username}`).then(response => {
            // get the id from profile
            const profile = response.data;
            const id = profile.id;
            if (!id) return errorFindCached({ "error": "UserNotFound" });
            // with id we can fetch TW again for the image
            axios.get(`${AVATAR_URL}${id}`, {
                responseType: 'arraybuffer'
            }).then(response => {
                const buffer = response.data;
                // cache
                CachedScratchUsers[username] = buffer;
                // save
                fs.writeFile(`./cache/${username}.png`, buffer, (err) => {
                    if (err) {
                        if (Enviornment.LOG_FAILED) {
                            console.log(`epic fail`);
                        }
                    }
                });
                // send
                res.status(200);
                res.contentType('image/png');
                res.send(buffer);
            }).catch(err => {
                errorFindCached({ "error": `CouldNotGetImage:${err}` });
            });
        }).catch(err => {
            errorFindCached({ "error": `ErrorGettingFromExternalSite:${err}` });
            return;
        });
    }, RequestQueue);
};

module.exports = {
    type: TYPE,
    callback: FUNC
};