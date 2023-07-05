const Enviornment = require("../../../../classes/Enviornment");

const CachedScratchUsers = {}
let RequestQueue = 0

// TODO: basically rewrite all of this tbh

const API_URL = 'https://trampoline.turbowarp.org/api/';

const TYPE = "GET";
const FUNC = (req, res) => {
    const username = String(req.query.username);
    if (!username) {
        res.status(400)
        res.json({ "error": "UsernameNotSpecified" })
        return
    }
    if (CachedScratchUsers[username] != null) {
        const image = CachedScratchUsers[username]
        res.status(200)
        res.contentType('image/png');
        res.send(Buffer.from(String(image).split(",")[1], 'base64'))
        return
    }
    function errorFindCached(err) {
        if (Enviornment.LOG_FAILED) {
            console.log(err);
        }
        fs.readFile(`./cache/${username}.uri`, (err, image) => {
            if (err) {
                res.status(500)
                res.json(err)
                return
            }
            // data uri found
            res.status(200)
            res.contentType('image/png');
            res.send(Buffer.from(String(image).split(",")[1], 'base64'))
        })
    }
    // make sure we arent spamming
    if (RequestQueue < 0) RequestQueue = 0
    RequestQueue += 1000
    setTimeout(() => {
        RequestQueue -= 1000;
        // we are past the queue
        fetch(`${API_URL}/users/${username}`).then(data => {
            data.json().then(profile => {
                // TODO: mak work
                // https://trampoline.turbowarp.org/avatars/5354974
            });
        });
        // fetch(`https://api.allorigins.win/raw?url=https://api.scratch.mit.edu/users/${username}`).then(data => {
        //     let textret = ""
        //     data.text().then(text => {
        //         textret = text
        //         const json = JSON.parse(text)
        //         if (!json.profile) {
        //             res.status(400)
        //             res.json({ "error": `UserDoesNotExist`, "data": json })
        //             return
        //         }
        //         const images = json.profile.images
        //         console.log("caching profile image of", username)
        //         const imageUrl = images[Object.getOwnPropertyNames(images)[0]]
        //         function errorFunction(err) {
        //             errorFindCached({ "error": `RequestNearlyFinishedBeforeExceptionOccurred:${err}`, "data": { imageUrl: imageUrl } })
        //         }
        //         fetch(`https://api.allorigins.win/raw?url=${imageUrl}`).then(response => {
        //             response.blob().then(blob => {
        //                 return new Promise(async resolve => {
        //                     const text = await blob.arrayBuffer()
        //                     const buffer = Buffer.from(text)
        //                     const dataUri = "data:image/png;base64," + buffer.toString('base64')
        //                     resolve(dataUri)
        //                 })
        //             }).then(dataUrl => {
        //                 CachedScratchUsers[username] = dataUrl
        //                 const image = CachedScratchUsers[username]
        //                 fs.writeFile(`./cache/${username}.uri`, image, "utf8", (err) => {
        //                     if (err) console.log(`epic fail`)
        //                 })
        //                 res.status(200)
        //                 res.contentType('image/png');
        //                 res.send(Buffer.from(String(image).split(",")[1], 'base64'))
        //             }).catch(errorFunction)
        //         }).catch(errorFunction)
        //     }).catch(async err => {
        //         errorFindCached({ "error": `JSONFromExternalSiteExperiencedErrorWhileReading`, "jsonerror": String(err), "returned": textret })
        //         return
        //     })
        // }).catch(err => {
        //     errorFindCached({ "error": `ErrorFromExternalSite:${err}` })
        //     return
        // })
    }, RequestQueue)
};

module.exports = {
    type: TYPE,
    callback: FUNC
};