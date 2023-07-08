/**
 * @fileoverview Main API file that the server will run
 */

const fs = require("fs");
const Enviornment = require("./classes/Enviornment");
const Database = require("easy-json-database");

const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 8080;

const { encrypt, decrypt } = require("./utilities/encrypt.js");

const AdminUsernames = require("./admins.json");
const UserManager = require("./classes/UserManager.js");
UserManager.load(); // should prevent logouts

const MainApi = {
    Core: require("./api/core"),
    Redirects: require("./api/redirects"),

    V1: require("./api/v1"),
}

// TODO: move these to utilities probably
function DecryptArray(array) {
    const na = [];
    array.forEach((value) => {
        na.push(decrypt(value));
    })
    return na;
}
function SafeJSONParse(json) {
    let canparse = true;
    try {
        JSON.parse(json);
    } catch {
        canparse = false;
    }
    return canparse ? JSON.parse(json) : {};
}

// setup cors & bodyparser (bodyparser uhhh parses request body lolol)
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(bodyParser.urlencoded({
    limit: Enviornment.SERVER_SIZE,
    extended: false
}));
app.use(bodyParser.json({ limit: Enviornment.SERVER_SIZE }));

// mmmmmetadataeaeae
app.get('/icon.png', async function (req, res) {
    res.status(200)
    res.header("Content-Type", 'image/png');
    res.sendFile(path.join(__dirname, "icon.png"))
});

// Basic Metadata & Redirect stuff
// These redirects exist for legacy shortcuts
for (const originalPath in MainApi.Redirects) {
    app.get(originalPath, (_, res) => {
        const redirect = MainApi.Redirects[originalPath]
        res.redirect(redirect);
    });
}

// Set API paths
for (const api in MainApi) {
    // dont do this for redirects
    if (MainApi[api] === MainApi.Redirects) continue;
    // create prefix
    const prefix = '/' + api.toLowerCase();
    const realApi = MainApi[api];
    // for each path, run its function when going to that path
    for (const path in realApi) {
        const page = realApi[path];
        const requestType = String(page.type).toLowerCase();
        app[requestType](prefix + path, page.callback);
    }
}

// start the server
app.listen(port, () => console.log('Started server on port ' + port));

// TODO: move ALL api stuff below into the v1 folder

// security stuff i guess
// app.get('/api/users/isBanned', async function (req, res) {
//     if (typeof req.query.username != "string") {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "InvalidRequest" })
//         return
//     }
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "banned": UserManager.isBanned(req.query.username) })
// })
// // get approved projects
// app.get('/api/projects/getApproved', async function (req, res) {
//     const db = new Database(`${__dirname}/projects/published.json`)
//     // this is explained in paged api but basically just add normal projects to featured projects
//     // because otherwise featured projects would come after normal projects
//     const featuredProjects = []
//     const projects = db.all().map(value => { return value.data }).sort((project, sproject) => {
//         return sproject.date - project.date
//     }).filter(proj => proj.accepted == true).filter(project => {
//         if (project.featured) {
//             featuredProjects.push(project)
//         }
//         return project.featured != true
//     })
//     const returnArray = featuredProjects.concat(projects)
//     res.header("Content-Type", 'application/json');
//     res.status(200)
//     res.json(returnArray);
// })
// // get approved projects but only a certain amount
// app.get('/api/projects/max', async function (req, res) {
//     function grabArray() {
//         const db = new Database(`${__dirname}/projects/published.json`)
//         // this is explained in paged api but basically just add normal projects to featured projects
//         // because otherwise featured projects would come after normal projects
//         const featuredProjects = []
//         const projects = db.all().map(value => { return value.data }).sort((project, sproject) => {
//             return sproject.date - project.date
//         }).filter(proj => proj.accepted == true).filter(project => {
//             if (project.featured) {
//                 featuredProjects.push(project)
//             }
//             return project.featured != true
//         })
//         if (String(req.query.featured) == "true") {
//             return featuredProjects
//         }
//         if (String(req.query.hidefeatured) == "true") {
//             return projects
//         }
//         const returnArray = featuredProjects.concat(projects)
//         return returnArray
//     }
//     let count = Number(req.query.amount)
//     if (isNaN(count)) count = 0
//     if (!isFinite(count)) count = 0
//     if (count > 100) count = 100
//     count = Math.round(count)
//     const arr = grabArray().slice(0, count);
//     res.header("Content-Type", 'application/json');
//     res.status(200)
//     res.json(arr);
// })
// // get unapproved projects
// app.get('/api/projects/getUnapproved', async function (req, res) {
//     // 6/3/2023 unapproved projects are admin only
//     const packet = req.query
//     if (!UserManager.isCorrectCode(packet.user, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     if (!AdminUsernames.includes(packet.user)) {
//         res.status(403)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "ThisAccountCannotAccessThisInformation" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     const projects = db.all().map(value => { return value.data }).sort((project, sproject) => {
//         return sproject.date - project.date
//     }).filter(proj => proj.accepted == false)
//     const returnArray = projects
//     res.header("Content-Type", 'application/json');
//     res.status(200)
//     res.json(returnArray);
// })
// // pm wrappers so that pm code doesnt need to be changed in a major way
// app.get('/api/pmWrapper/projects', async function (req, res) {
//     const db = new Database(`${__dirname}/projects/published.json`)
//     // this is explained in paged api but basically just add normal projects to featured projects
//     // because otherwise featured projects would come after normal projects
//     const featuredProjects = []
//     const projects = db.all().map(value => { return value.data }).sort((project, sproject) => {
//         return sproject.date - project.date
//     }).map(project => {
//         return { id: project.id, name: project.name, author: { username: project.owner }, accepted: project.accepted, featured: project.featured }
//     }).filter(proj => proj.accepted == true).filter(project => {
//         if (project.featured) {
//             featuredProjects.push(project)
//         }
//         return project.featured != true
//     })
//     const returnArray = featuredProjects.concat(projects)
//     res.header("Content-Type", 'application/json');
//     res.status(200)
//     res.json(returnArray);
// })
// app.get('/api/pmWrapper/remixes', async function (req, res) {
//     const packet = req.query
//     if (!packet.id) {
//         res.status(400)
//         res.json({ "error": "IdNotSpecified" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     //
//     const json = db.all().map(value => { return value.data }).sort((project, sproject) => {
//         return sproject.date - project.date
//     }).filter(proj => proj.remix == packet.id).filter(proj => proj.accepted == true)
//     res.header("Content-Type", 'application/json');
//     res.status(200)
//     res.json(json);
// })
// app.get('/api/pmWrapper/iconUrl', async function (req, res) {
//     if (!req.query.id) {
//         res.status(400)
//         res.json({ "error": "IdNotSpecified" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     const json = db.get(String(req.query.id))
//     if (!json) {
//         res.status(400)
//         res.json({ "error": "IdNotValid" })
//         return
//     }
//     fs.readFile(`./projects/uploadedImages/p${json.id}.uri`, "utf-8", (err, uri) => {
//         if (err) {
//             res.status(404)
//             res.json({ "error": "ImageNotFound" })
//             return
//         }
//         res.status(200)
//         res.contentType('image/png');
//         const imageBuffer = Buffer.from(String(uri).split(",")[1], 'base64')
//         res.send(imageBuffer)
//     })
// })
// app.get('/api/pmWrapper/getProject', async function (req, res) {
//     if (!req.query.id) {
//         res.status(400)
//         res.json({ "error": "IdNotSpecified" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     const json = db.get(String(req.query.id))
//     if (!json) {
//         res.status(400)
//         res.json({ "error": "IdNotValid" })
//         return
//     }
//     res.status(200)
//     res.json({ id: json.id, name: json.name, author: { id: -1, username: json.owner, } })
// })
// const CachedScratchUsers = {}
// let ScratchRequestQueue = 0
// app.get('/api/pmWrapper/scratchUserImage', async function (req, res) {
//     if (!req.query.username) {
//         res.status(400)
//         res.json({ "error": "UsernameNotSpecified" })
//         return
//     }
//     if (CachedScratchUsers[req.query.username] != null) {
//         const image = CachedScratchUsers[req.query.username]
//         res.status(200)
//         res.contentType('image/png');
//         res.send(Buffer.from(String(image).split(",")[1], 'base64'))
//         return
//     }
//     function errorFindCached(err) {
//         fs.readFile(`./cache/${req.query.username}.uri`, (err, image) => {
//             if (err) {
//                 res.status(500)
//                 res.json(err)
//                 return
//             }
//             // data uri found
//             res.status(200)
//             res.contentType('image/png');
//             res.send(Buffer.from(String(image).split(",")[1], 'base64'))
//         })
//     }
//     if (ScratchRequestQueue < 0) ScratchRequestQueue = 0
//     ScratchRequestQueue += 1000
//     setTimeout(() => {
//         ScratchRequestQueue -= 1000
//         fetch(`https://api.allorigins.win/raw?url=https://api.scratch.mit.edu/users/${req.query.username}`).then(data => {
//             let textret = ""
//             data.text().then(text => {
//                 textret = text
//                 const json = JSON.parse(text)
//                 if (!json.profile) {
//                     res.status(400)
//                     res.json({ "error": `UserDoesNotExist`, "data": json })
//                     return
//                 }
//                 const images = json.profile.images
//                 console.log("caching profile image of", req.query.username)
//                 const imageUrl = images[Object.getOwnPropertyNames(images)[0]]
//                 function errorFunction(err) {
//                     errorFindCached({ "error": `RequestNearlyFinishedBeforeExceptionOccurred:${err}`, "data": { imageUrl: imageUrl } })
//                 }
//                 fetch(`https://api.allorigins.win/raw?url=${imageUrl}`).then(response => {
//                     response.blob().then(blob => {
//                         return new Promise(async resolve => {
//                             const text = await blob.arrayBuffer()
//                             const buffer = Buffer.from(text)
//                             const dataUri = "data:image/png;base64," + buffer.toString('base64')
//                             resolve(dataUri)
//                         })
//                     }).then(dataUrl => {
//                         CachedScratchUsers[req.query.username] = dataUrl
//                         const image = CachedScratchUsers[req.query.username]
//                         fs.writeFile(`./cache/${req.query.username}.uri`, image, "utf8", (err) => {
//                             if (err) console.log(`epic fail`)
//                         })
//                         res.status(200)
//                         res.contentType('image/png');
//                         res.send(Buffer.from(String(image).split(",")[1], 'base64'))
//                     }).catch(errorFunction)
//                 }).catch(errorFunction)
//             }).catch(async err => {
//                 errorFindCached({ "error": `JSONFromExternalSiteExperiencedErrorWhileReading`, "jsonerror": String(err), "returned": textret })
//                 return
//             })
//         }).catch(err => {
//             errorFindCached({ "error": `ErrorFromExternalSite:${err}` })
//             return
//         })
//     }, ScratchRequestQueue)
// })
// // scratch auth implementation
// app.get('/api/users/login', async function (req, res) {
//     const privateCode = req.query.privateCode
//     UserManager.verifyCode(privateCode).then(response => {
//         if (!response.valid) {
//             res.status(400)
//             res.header("Content-Type", 'application/json');
//             res.json({ "error": "InvalidLogin" })
//             return
//         }
//         UserManager.setCode(response.username, privateCode)
//         res.header("Content-Type", 'application/json');
//         res.status(200)
//         res.json({ "success": "Login set, please save your private code as it is your PenguinMod password now." })
//     }).catch(err => {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "InvalidLogin" })
//     })
// })
// app.get('/api/users/usernameFromCode', async function (req, res) {
//     const privateCode = req.query.privateCode
//     const username = UserManager.usernameFromCode(privateCode)
//     if (username == null) {
//         res.status(404)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "CodeNotFound" })
//         return
//     }
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "username": username })
// })
// // extra stuff
// app.get('/api/users/isAdmin', async function (req, res) {
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "admin": AdminUsernames.includes(req.query.username) })
// })
// app.get('/api/users/getMyProjects', async function (req, res) {
//     if (!UserManager.isCorrectCode(req.query.user, req.query.code)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     const projects = db.all().map(data => data.data).filter(project => project.owner === req.query.user)

//     let result = projects

//     if (String(req.query.sorted) === "true") {
//         result.sort((project, sproject) => {
//             return sproject.date - project.date
//         })
//         const featuredProjects = []
//         const waitingProjects = []
//         const hiddenProjects = []
//         result = result.filter(project => {
//             if (project.featured) {
//                 featuredProjects.push(project)
//                 return false
//             }
//             if (!project.accepted) {
//                 waitingProjects.push(project)
//                 return false
//             }
//             if (project.hidden) {
//                 hiddenProjects.push(project)
//                 return false
//             }
//             return true
//         })
//         const returnArray = featuredProjects.concat(result, waitingProjects, hiddenProjects)
//         result = returnArray
//     }

//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json(result)
// })
// // store temporary data
// // app.post('/api/users/store', async function (req, res) {
// //     const packet = req.body
// //     if (!UserManager.isCorrectCode(packet.container, packet.token)) {
// //         res.status(400)
// //         res.header("Content-Type", 'application/json');
// //         res.json({ "error": "Reauthenticate" })
// //         return
// //     }
// //     let success = true
// //     let error = null
// //     try {
// //         StorageSpace.save(packet.container, packet.key, packet.value, true)
// //     } catch (err) {
// //         success = false
// //         error = err
// //     } finally {
// //         if (!success) {
// //             res.status(400)
// //             res.header("Content-Type", 'application/json');
// //             res.json({ "error": String(error) })
// //             return
// //         }
// //         res.status(200)
// //         res.header("Content-Type", 'application/json');
// //         res.json({ "success": true })
// //     }
// // })
// // app.get('/api/users/getstore', async function (req, res) {
// //     const packet = req.query
// //     if (!UserManager.isCorrectCode(packet.container, packet.token)) {
// //         res.status(400)
// //         res.header("Content-Type", 'application/json');
// //         res.json({ "error": "Reauthenticate" })
// //         return
// //     }
// //     res.status(200)
// //     res.header("Content-Type", 'application/json');
// //     res.json(StorageSpace.getContainer(packet.container))
// // })
// // approve uploaded projects
// app.get('/api/projects/approve', async function (req, res) {
//     const packet = req.query
//     if (!UserManager.isCorrectCode(packet.approver, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     if (!AdminUsernames.includes(packet.approver)) {
//         res.status(403)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "FeatureDisabledForThisAccount" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     if (!db.has(packet.id)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "NotFound" })
//         return
//     }
//     // newMeta
//     // replace
//     let isUpdated = false
//     let isRemix = false

//     let idToSetTo = packet.id
//     // idk if db uses a reference to the object or not
//     const project = JSON.parse(JSON.stringify(db.get(packet.id)))
//     if (project.updating) {
//         isUpdated = true
//     }
//     project.updating = false
//     project.accepted = true
//     if (project.remix != null) isRemix = true
//     if (packet.newMeta != null) {
//         const newMetadata = SafeJSONParse(packet.newMeta)
//         // in this case we'll trust the approver to have put strings as the values
//         // all approvers can edit the database directly anyways so it doesnt really matter
//         if (newMetadata.name != null) {
//             project.name = newMetadata.name
//         }
//         if (newMetadata.instructions != null) {
//             project.instructions = newMetadata.instructions
//         }
//         if (newMetadata.notes != null) {
//             project.notes = newMetadata.notes
//         }
//         // todo: editing images is not yet possible due to april 11th metadata corruption changing the project format
//         // if (newMetadata.image != null) {
//         //     project.image = newMetadata.image
//         // }
//     }
//     let shouldCreateBackup = false
//     let isUpdatingProjectData = false
//     let replacedWithId = 0
//     if ((packet.replace != null) && (String((packet.replace == null) ? "" : packet.replace).replace(/ /gmi, "") !== "")) {
//         idToSetTo = Number(packet.replace)
//         if (!db.has(String(idToSetTo))) {
//             res.status(400)
//             res.header("Content-Type", 'application/json');
//             res.json({ "error": "CannotReplaceANonExistentProject" })
//             return
//         }
//         const replacingProject = db.get(String(idToSetTo))
//         if (replacingProject.owner !== project.owner) {
//             res.status(400)
//             res.header("Content-Type", 'application/json');
//             res.json({ "error": "CannotReplaceProjectOwnedByAnotherPerson" })
//             // console.log("tried to replace", replacingProject.id, "with", project.id)
//             return
//         }
//         isUpdated = true
//         project.featured = replacingProject.featured
//         console.log(packet.approver, "replaced", replacingProject.id, "with", project.id)
//         replacedWithId = project.id
//         project.id = replacingProject.id
//         shouldCreateBackup = true
//         isUpdatingProjectData = true
//     }
//     if (shouldCreateBackup) {
//         const backupFolder = `./projects/backup/Backup${idToSetTo}`
//         try {
//             fs.mkdirSync(backupFolder)
//         } catch { }
//         const dbEntry = db.get(String(idToSetTo))
//         fs.writeFile(`${backupFolder}/entry.json`, JSON.stringify(dbEntry), err => { if (err) console.log("failed to create backup of db entry;", err) })
//         const fileData = fs.readFileSync(`./projects/uploaded/p${idToSetTo}.txt`, "utf-8")
//         fs.writeFile(`${backupFolder}/data.txt`, fileData, err => { if (err) console.log("failed to create backup of project data;", err) })
//     }
//     db.set(String(idToSetTo), project)
//     if (isUpdatingProjectData) {
//         const fileData = fs.readFileSync(`./projects/uploaded/p${replacedWithId}.txt`, "utf-8")
//         fs.writeFile(`./projects/uploaded/p${idToSetTo}.txt`, fileData, err => { if (err) console.log("failed to update project data;", err) })
//     }
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "success": true })
//     if (String(req.query.webhook) === "false") return
//     const projectImage = String(`https://projects.penguinmod.site/api/pmWrapper/iconUrl?id=${project.id}&rn=${Math.round(Math.random() * 9999999)}`)
//     const body = JSON.stringify({
//         content: `A project was ${isUpdated ? "updated" : (isRemix ? "remixed" : "approved")}!`,
//         embeds: [{
//             title: String(project.name).substring(0, 250),
//             description: String(project.instructions + "\n\n" + project.notes).substring(0, 2040),
//             image: { url: projectImage },
//             color: (isUpdated ? 14567657 : (isRemix ? 6618880 : 41440)),
//             url: String("https://studio.penguinmod.site/#" + String(project.id)),
//             author: {
//                 name: String(project.owner).substring(0, 50),
//                 icon_url: String("https://projects.penguinmod.site/api/pmWrapper/scratchUserImage?username=" + String(project.owner).substring(0, 50)),
//                 url: String("https://penguinmod.site/profile?user=" + String(project.owner).substring(0, 50))
//             }
//         }]
//     })
//     fetch(Enviornment.DISCORD_WEBHOOK, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(JSON.parse(body))
//     })
//     // .then(res => res.text().then(t => console.log("WebhookResponse",res.status,t))).catch(err => console.log("FailedWebhookSend", err))
// })
// // feature uploaded projects
// app.get('/api/projects/feature', async function (req, res) {
//     const packet = req.query
//     if (!UserManager.isCorrectCode(packet.approver, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     if (!AdminUsernames.includes(packet.approver)) {
//         res.status(403)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "FeatureDisabledForThisAccount" })
//         return
//     }
//     const idToSetTo = String(packet.id)
//     const db = new Database(`${__dirname}/projects/published.json`)
//     if (!db.has(idToSetTo)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "NotFound" })
//         return
//     }
//     // idk if db uses a reference to the object or not
//     const project = JSON.parse(JSON.stringify(db.get(idToSetTo)))
//     if (!project.accepted) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "CantFeatureUnapprovedProject" })
//         return
//     }
//     if (project.votes.length < 6) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "CantFeatureProjectWithLessThan6Votes" })
//         return
//     }
//     project.featured = true
//     db.set(String(idToSetTo), project)
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "success": true })
//     if (String(req.query.webhook) === "false") return
//     const projectImage = String(`https://projects.penguinmod.site/api/pmWrapper/iconUrl?id=${project.id}&rn=${Math.round(Math.random() * 9999999)}`)
//     const projectTitle = String(project.name).substring(0, 250)
//     const body = JSON.stringify({
//         content: `⭐ **${projectTitle}** was **featured**! ⭐`,
//         embeds: [{
//             title: projectTitle,
//             image: { url: projectImage },
//             color: 16771677,
//             url: String("https://studio.penguinmod.site/#" + String(project.id)),
//             author: {
//                 name: String(project.owner).substring(0, 50),
//                 icon_url: String("https://projects.penguinmod.site/api/pmWrapper/scratchUserImage?username=" + String(project.owner).substring(0, 50)),
//                 url: String("https://penguinmod.site/profile?user=" + String(project.owner).substring(0, 50))
//             }
//         }]
//     })
//     fetch(Enviornment.DISCORD_WEBHOOK, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(JSON.parse(body))
//     })
//     // .then(res => res.text().then(t => console.log("WebhookResponse",res.status,t))).catch(err => console.log("FailedWebhookSend", err))
// })
// // toggle liking or voting for uploaded projects
// app.post('/api/projects/toggleProjectVote', async function (req, res) {
//     const packet = req.body
//     const username = String(packet.user)
//     if (!UserManager.isCorrectCode(username, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     const idToSetTo = String(packet.id)
//     const db = new Database(`${__dirname}/projects/published.json`)
//     if (!db.has(idToSetTo)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "NotFound" })
//         return
//     }
//     // idk if db uses a reference to the object or not
//     const project = JSON.parse(JSON.stringify(db.get(idToSetTo)))
//     if ((packet.type === 'votes') && (!project.accepted)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "CantVoteUnapprovedProject" })
//         return
//     }
//     let targetType = 'loves';
//     if (packet.type === 'votes') {
//         targetType = 'votes';
//     }
//     if (!Array.isArray(project[targetType])) {
//         project[targetType] = [];
//     }
//     const userValue = encrypt(username)
//     let voted = true
//     if (DecryptArray(project[targetType]).includes(username)) {
//         project[targetType].splice(project[targetType].indexOf(userValue), 1)
//         voted = false
//     } else {
//         project[targetType].push(userValue)
//     }
//     if ((targetType === 'votes') && (project.votes.length >= 6)) {
//         // people lik this project
//         project.featured = true
//         if (project.featureWebhookSent !== true) {
//             project.featureWebhookSent = true
//             const projectImage = String(`https://projects.penguinmod.site/api/pmWrapper/iconUrl?id=${project.id}&rn=${Math.round(Math.random() * 9999999)}`)
//             const projectTitle = String(project.name).substring(0, 250)
//             const body = JSON.stringify({
//                 content: `⭐ **${projectTitle}** has been community featured! ⭐`,
//                 embeds: [{
//                     title: projectTitle,
//                     image: { url: projectImage },
//                     color: 16771677,
//                     url: String("https://studio.penguinmod.site/#" + String(project.id)),
//                     author: {
//                         name: String(project.owner).substring(0, 50),
//                         icon_url: String("https://projects.penguinmod.site/api/pmWrapper/scratchUserImage?username=" + String(project.owner).substring(0, 50)),
//                         url: String("https://penguinmod.site/profile?user=" + String(project.owner).substring(0, 50))
//                     }
//                 }]
//             })
//             fetch(Enviornment.DISCORD_WEBHOOK, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(JSON.parse(body))
//             })
//         }
//     }
//     db.set(idToSetTo, project)
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "state": voted })
// })
// app.get('/api/projects/getProjectVote', async function (req, res) {
//     const packet = req.query
//     const username = String(packet.user)
//     if (!UserManager.isCorrectCode(username, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     const idToSetTo = String(packet.id)
//     const db = new Database(`${__dirname}/projects/published.json`)
//     if (!db.has(idToSetTo)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "NotFound" })
//         return
//     }
//     // idk if db uses a reference to the object or not
//     const project = JSON.parse(JSON.stringify(db.get(idToSetTo)))
//     if (!Array.isArray(project.loves)) {
//         project.loves = [];
//     }
//     if (!Array.isArray(project.votes)) {
//         project.votes = [];
//     }
//     const userValue = encrypt(username)
//     const loved = DecryptArray(project.loves).includes(username)
//     const voted = DecryptArray(project.votes).includes(username)
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "loved": loved, "voted": voted })
// })
// // delete uploaded projects
// app.get('/api/projects/delete', async function (req, res) {
//     const packet = req.query
//     if (!UserManager.isCorrectCode(packet.approver, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     if (!db.has(packet.id)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "NotFound" })
//         return
//     }
//     const project = db.get(String(packet.id))
//     if (project.owner !== packet.approver) {
//         if (!AdminUsernames.includes(packet.approver)) {
//             res.status(403)
//             res.header("Content-Type", 'application/json');
//             res.json({ "error": "FeatureDisabledForThisAccount" })
//             return
//         }
//     }
//     db.delete(String(packet.id))
//     fs.unlink(`./projects/uploaded/p${packet.id}.txt`, err => {
//         if (err) console.log("failed to delete project data for", packet.id, ";", err)
//     })
//     fs.unlink(`./projects/uploadedImages/p${packet.id}.uri`, err => {
//         if (err) console.log("failed to delete project image for", packet.id, ";", err)
//     })
//     console.log(packet.approver, "deleted", packet.id)
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "success": true })
// })
// // update uploaded projects
// app.post('/api/projects/update', async function (req, res) {
//     const packet = req.body
//     if (!UserManager.isCorrectCode(packet.requestor, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         return
//     }
//     const db = new Database(`${__dirname}/projects/published.json`)
//     const id = String(packet.id)
//     if (!db.has(id)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "NotFound" })
//         return
//     }
//     const project = db.get(String(id))
//     if (project.owner !== packet.requestor) {
//         if (!AdminUsernames.includes(packet.requestor)) {
//             res.status(403)
//             res.header("Content-Type", 'application/json');
//             res.json({ "error": "FeatureDisabledForThisAccount" })
//             return
//         }
//     }
//     if (typeof packet.newMeta === "string") {
//         const newMetadata = SafeJSONParse(packet.newMeta)
//         let updatingProject = false
//         if (typeof newMetadata.name === "string") {
//             project.name = newMetadata.name
//             if (newMetadata.name.length < 3 || newMetadata.name.length > 50) {
//                 res.status(400)
//                 res.header("Content-Type", 'application/json');
//                 res.json({ "error": "Title3-50Chars" })
//                 if (Enviornment.LOG_FAILED) console.log("Title3-50Chars", packet)
//                 return
//             }
//             updatingProject = true
//         }
//         if (typeof newMetadata.instructions === "string") {
//             project.instructions = newMetadata.instructions
//             if (newMetadata.instructions && (newMetadata.instructions.length > 4096)) {
//                 res.status(400)
//                 res.header("Content-Type", 'application/json');
//                 res.json({ "error": "Instructions4096Longer" })
//                 if (Enviornment.LOG_FAILED) console.log("Instructions4096Longer", packet)
//                 return
//             }
//             updatingProject = true
//         }
//         if (typeof newMetadata.notes === "string") {
//             project.notes = newMetadata.notes
//             if (newMetadata.notes && (newMetadata.notes.length > 4096)) {
//                 res.status(400)
//                 res.header("Content-Type", 'application/json');
//                 res.json({ "error": "Notes4096Longer" })
//                 if (Enviornment.LOG_FAILED) console.log("Notes4096Longer", packet)
//                 return
//             }
//             updatingProject = true
//         }
//         // if yea then do
//         if (updatingProject) {
//             project.accepted = false
//             project.featured = false
//             project.updating = true
//             project.date = Date.now()
//         }
//     }
//     const projectUri = packet.project
//     if (typeof projectUri === "string") {
//         fs.writeFile(`./projects/uploaded/p${id}.txt`, projectUri, "utf8", (err) => {
//             if (err) console.error(err)
//         })
//         project.accepted = false
//         project.featured = false
//         project.updating = true
//         project.date = Date.now()
//     }
//     const projectUriImage = packet.image
//     if (typeof projectUriImage === "string") {
//         fs.writeFile(`./projects/uploadedImages/p${id}.uri`, projectUriImage, "utf8", (err) => {
//             if (err) console.error(err)
//         })
//         project.accepted = false
//         project.featured = false
//         project.updating = true
//         project.date = Date.now()
//     }
//     db.set(String(id), project)
//     console.log(packet.requestor, "updated", id)
//     res.status(200)
//     res.header("Content-Type", 'application/json');
//     res.json({ "success": true })
// })
// // upload project to the main page
// const UploadsDisabled = false
// app.post('/api/projects/publish', async function (req, res) {
//     if (UploadsDisabled) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "PublishDisabled" })
//         return;
//     }
//     const packet = req.body
//     if (UserManager.isBanned(packet.author)) {
//         res.status(403)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "FeatureDisabledForThisAccount" })
//         return;
//     }

//     if (!UserManager.isCorrectCode(packet.author, packet.passcode)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Reauthenticate" })
//         if (Enviornment.LOG_FAILED) console.log("Reauthenticate", packet);
//         return
//     }

//     // cooldown check
//     let db = new Database(`${__dirname}/cooldown.json`)
//     const cooldown = Number(db.get(packet.author))
//     if (Date.now() < cooldown) {
//         res.status(429)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "TooManyRequests" })
//         return
//     }

//     if (!(packet.title && packet.author)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "MissingTitleAuthorReference" })
//         if (Enviornment.LOG_FAILED) console.log("MissingTitleAuthorReference", packet);
//         return
//     }
//     if (!packet.project) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "MissingProjectData" })
//         if (Enviornment.LOG_FAILED) console.log("MissingProjectData", packet);
//         return
//     }

//     if (
//         (typeof packet.title !== "string") ||
//         (typeof packet.author !== "string") ||
//         (typeof packet.image !== "string") ||
//         (typeof packet.project !== "string")
//     ) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "FormatError" })
//         if (Enviornment.LOG_FAILED) {
//             console.log("FormatError", packet)
//             fs.writeFile("./temp.log", JSON.stringify(packet), err => {
//                 if (err) console.log(err)
//             })
//         };
//         return
//     }
//     if (packet.instructions && (typeof packet.instructions !== "string")) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "FormatError" })
//         if (Enviornment.LOG_FAILED) console.log("FormatError", packet);
//         return
//     }
//     if (packet.notes && (typeof packet.notes !== "string")) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "FormatError" })
//         if (Enviornment.LOG_FAILED) console.log("FormatError", packet);
//         return
//     }
//     if (packet.remix && (typeof packet.remix !== "number")) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "FormatErrorRemixMustBeProjectIdAsNumber" })
//         if (Enviornment.LOG_FAILED) console.log("FormatErrorRemixMustBeProjectIdAsNumber", packet);
//         return
//     }
//     if (packet.title.length < 3 || packet.title.length > 50) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Title3-50Chars" })
//         if (Enviornment.LOG_FAILED) console.log("Title3-50Chars", packet)
//         return
//     }
//     if (packet.instructions && (packet.instructions.length > 4096)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Instructions4096Longer" })
//         if (Enviornment.LOG_FAILED) console.log("Instructions4096Longer", packet)
//         return
//     }
//     if (packet.notes && (packet.notes.length > 4096)) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "Notes4096Longer" })
//         if (Enviornment.LOG_FAILED) console.log("Notes4096Longer", packet)
//         return
//     }

//     // set cooldown
//     db.set(packet.author, Date.now() + 480000)

//     // create project id
//     db = new Database(`${__dirname}/projects/published.json`)
//     let _id = Math.round(100000 + (Math.random() * 99999999))
//     if (db.has(String(_id))) {
//         while (db.has(String(_id))) _id++
//     }
//     const id = _id

//     const project = packet.project
//     fs.writeFile(`./projects/uploaded/p${id}.txt`, project, "utf8", (err) => {
//         if (err) console.error(err)
//     })
//     fs.writeFile(`./projects/uploadedImages/p${id}.uri`, packet.image, "utf8", (err) => {
//         if (err) console.error(err)
//     })
//     db.set(String(id), {
//         id: id, // surprisingly this is useful to keep the id in the key named the id (unless my code is bad)
//         name: packet.title,
//         instructions: packet.instructions,
//         notes: packet.notes,
//         owner: packet.author,
//         // we dont save image in the project anymore
//         // image: packet.image, // base64 url
//         // project: packet.project, // base64 url (not saved here since we save it in a file instead)
//         featured: false, // if true, display it golden in pm or something idk
//         accepted: false, // must be accepted before it can appear on the public page

//         remix: packet.remix,

//         date: Date.now(), // set the creation date to now

//         views: 0, // how many times the project file was grabbed in the api
//         loves: [], // list of (encrypted) usernames who loved the project
//         votes: [], // list of (encrypted) usernames who voted for the project to be featured

//         rating: packet.rating, // E, E+10, T ratings (or ? for old projects)
//     })
//     res.status(200)
//     res.json({ "published": id })
//     console.log(packet.title, "was published!")
// })
// // gets a published project
// app.get('/api/projects/getPublished', async function (req, res) {
//     if ((req.query.id) == null) {
//         res.status(400)
//         res.header("Content-Type", 'application/json');
//         res.json({ "error": "NoIDSpecified" })
//         return
//     }
//     db = new Database(`${__dirname}` + "/projects/published" + ".json");
//     if (db.has(String(req.query.id))) {
//         const project = db.get(String(req.query.id))
//         if (String(req.query.type) == "uri") {
//             res.status(200)
//             res.header("Content-Type", 'text/plain');
//             res.sendFile(`./projects/uploaded/p${project.id}.txt`)
//             return
//         }
//         if (String(req.query.type) == "file") {
//             fs.readFile(`./projects/uploaded/p${project.id}.txt`, "utf8", (err, data) => {
//                 if (err) {
//                     res.status(500)
//                     res.header("Content-Type", 'text/plain');
//                     res.send(`<UnknownError err="${err}">`)
//                     return
//                 }
//                 let sendContent = ""
//                 let worked = true
//                 try {
//                     sendContent = Buffer.from(String(data).split(",")[1], 'base64')
//                 } catch (err) {
//                     worked = false
//                     res.status(500)
//                     res.json({ "error": "UnknownSituation", "data": String(err) })
//                     return
//                 } finally {
//                     if (worked) {
//                         if (typeof project.views !== "number") {
//                             project.views = 0
//                         }
//                         project.views += 1
//                         db.set(String(req.query.id), project)
//                         res.status(200)
//                         res.header("Content-Type", 'application/x.scratch.sb3');
//                         res.send(sendContent)
//                     }
//                 }
//             })
//             return
//         }
//         res.status(200)
//         res.json(project)

//     } else {
//         res.status(404)
//         res.json({ "error": "NotFound" })
//     }
// })
// // get project by id
// // app.get('/api/projects/get', async function(req, res) {
// //     if ((req.query.id) == null) {
// //         res.status(400)
// //         res.header("Content-Type", 'application/json');
// //         res.json({ "error": "NoIDSpecified" })
// //         return
// //     }
// //     db = new Database(`${__dirname}` + "/projects/published" + ".json");
// //     if (db.has(String(req.query.id))) {
// //         db = new Database(`${__dirname}` + "/projects/metadata" + ".json");
// //         item = db.get(String((req.query.id)));
// //         return
// //     }
// //     db = new Database(`${__dirname}` + "/projects/metadata" + ".json");
// //     if (db.has(String(req.query.id))) {
// //         res.status(200)
// //         item = db.get(String((req.query.id)));
// //         if ((req.query.json) == 'true') {
// //             res.header("Content-Type", 'application/json');
// //             res.sendFile(path.join(__dirname, (item.file)));
// //             return
// //         }
// //         res.json(item);
// //     } else {
// //         res.status(404)
// //         res.json({ "error": "NotFound" })
// //     }
// // })
// // sorts the projects into a nice array of pages
// app.get('/api/projects/paged', async function (req, res) {
//     db = new Database(`${__dirname}` + "/projects/published.json");
//     res.header("Content-Type", 'application/json');
//     res.status(200)
//     const projectOwnerRequired = req.query.user
//     const projectSearchingName = req.query.includes
//     const featuredProjectsArray = []
//     let array = db.all().map(obj => obj.data).sort((project, sproject) => {
//         return sproject.date - project.date
//     }).filter(proj => proj.accepted == true).filter(project => {
//         if (projectSearchingName) {
//             return String(project.name).toLowerCase().includes(String(projectSearchingName).toLowerCase())
//         }
//         if (typeof projectOwnerRequired !== "string") {
//             return true
//         }
//         return project.owner === projectOwnerRequired
//     }).filter(project => {
//         // add featured projects first but also sort them by date
//         // to do that we just add them to a seperate array and sort that
//         if (project.featured) {
//             featuredProjectsArray.push(project)
//         }
//         return project.featured != true
//     })
//     // sort featured projects
//     featuredProjectsArray.sort((project, sproject) => {
//         return sproject.date - project.date
//     })
//     // we set the array to featuredProjectsArray.concat(array) instead of array.concat(featuredProjectsArray)
//     // because otherwise the featured projects would be after the normal projects
//     array = featuredProjectsArray.concat(array)

//     const maxItems = req.query.length ? Number(req.query.length) : 12
//     if (maxItems <= 0) return res.json([])

//     const pagesArray = []
//     let page = []

//     for (let index = 0; index < array.length; index++) {
//         const item = array[index]
//         page.push(item)
//         if (index % maxItems == maxItems - 1) {
//             pagesArray.push(page)
//             page = []
//             continue
//         }
//         if (index >= array.length - 1 && page.length != maxItems) {
//             pagesArray.push(page)
//             page = []
//             continue
//         }
//     }

//     res.json(pagesArray)
// })

