module.exports = (app, utils) => {
    app.get('/api/v1/users/getmessages', utils.cors(), async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const page = utils.handle_page(packet.page);

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const messages = await utils.UserManager.getMessages(id, page, Number(utils.env.PageSize));

        const final = []
        for (const item of messages) {
            switch (item.message.type) {
                case "followerAdded":
                    item.message = {
                        user: {
                            id: item.message.user,
                            username: await utils.UserManager.getUsernameByID(item.message.user)
                        },
                        type: item.message.type
                    }

                    final.push(item);
                    break;
                case "projectFeatured":
                    item.message = {
                        project: {
                            id: item.projectID,
                            title: (await utils.UserManager.getProjectMetadata(item.projectID)).title
                        },
                        type: item.message.type
                    
                    }
                    final.push(item);
                    break;
                case "reject":
                    if (!item.message.hardReject) {
                        item.message = {
                            project: {
                                id: item.projectID,
                                title: (await utils.UserManager.getProjectMetadata(item.projectID)).title
                            },
                            ...item.message
                        }
                    } else {
                        item.message.project = {
                            id: item.projectID,
                            title: item.message.title
                        }
                    }
                    final.push(item);
                    break;
                case "remix":
                    item.message = {
                        oldProject: {
                            id: item.message.projectID,
                            title: (await utils.UserManager.getProjectMetadata(String(item.message.projectID))).title
                        },
                        newProject: {
                            id: item.projectID,
                            title: (await utils.UserManager.getProjectMetadata(String(item.projectID))).title
                        },
                        type: item.message.type
                    }
                    final.push(item);
                    break;
                case "restored":
                    item.message = {
                        project: {
                            id: item.projectID,
                            title: (await utils.UserManager.getProjectMetadata(item.projectID)).title
                        },
                        type: item.message.type
                    }
                    final.push(item);
                    break;
                default:
                    final.push(item);
                    break;
            }
        }

        res.header('Content-type', "application/json");
        res.send({ messages: final });
    });
}