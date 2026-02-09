require("dotenv").config();

const heatWebhook = process.env.HeatWebhook;
const reportWebhook = process.env.ReportWebhook;
const modWebhook = process.env.ModWebhook;
const adminWebhook = process.env.AdminWebhook;
const apiUpdatesWebhook = process.env.ApiUpdatesWebhook;
const creationWebhook = process.env.CreationWebhook;
const featuredWebhook = process.env.FeaturedWebhook;
const websiteInfoWebhook = process.env.WebsiteInfoWebhook;
const messagesWebhook = process.env.MessagesWebhook;
const watchlistWebhook = process.env.WatchlistWebhook;

function sendHeatLog(text, trigger, type, location, color = 0xff0000) {
    const body = JSON.stringify({
        embeds: [
            {
                title: `Filter Triggered`,
                color: color,
                description: `\`\`\`ansi\n${text}\n\`\`\``,
                fields: [
                    {
                        name: "Type",
                        value: `\`${type}\``,
                    },
                    {
                        name: "Trigger",
                        value: `\`${trigger}\``,
                    },
                    {
                        name: "Location",
                        value: `${JSON.stringify(location)}`,
                    },
                ],
                timestamp: new Date().toISOString(),
            },
        ],
    });
    try {
        fetch(heatWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendRenameLog(old_username, new_username, id) {
    const body = JSON.stringify({
        embeds: [
            {
                title: "User has new name",
                color: 0xa185af, // purple ish
                description: `${old_username}'s (${id}) username is now ${new_username}`,
                fields: [
                    {
                        name: "Old Username",
                        value: `\`${old_username}\``,
                    },
                    {
                        name: "New Username",
                        value: `\`${new_username}\``,
                    },
                    {
                        name: "ID",
                        value: `\`${id}\``,
                    },
                    {
                        name: "URL",
                        value: `https://penguinmod.com/profile?user=${new_username}`,
                    },
                ],
                author: {
                    name: new_username,
                    icon_url: String(
                        `${process.env.ApiURL}/api/v1/users/getpfp?username=${new_username}`,
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" + new_username,
                    ),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    });
    try {
        fetch(websiteInfoWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendBioUpdateLog(username, target, oldBio, newBio) {
    const body = JSON.stringify({
        content: `${target}'s bio was edited by ${username}`,
        embeds: [
            {
                title: `${target} had their bio edited`,
                color: 0xff0000,
                fields: [
                    {
                        name: "Edited by",
                        value: `${username}`,
                    },
                    {
                        name: "Old Bio",
                        value: `\`\`\`\n${oldBio}\n\`\`\``,
                    },
                    {
                        name: "New Bio",
                        value: `\`\`\`\n${newBio}\n\`\`\``,
                    },
                    {
                        name: "URL",
                        value: `https://penguinmod.com/profile?user=${target}`,
                    },
                ],
                author: {
                    name: target,
                    icon_url: String(
                        `${process.env.ApiURL}/api/v1/users/getpfp?username=${target}`,
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" + target,
                    ),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    });
    try {
        fetch(adminWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendReportLog(type, username, targetID, target, reason) {
    const body = JSON.stringify({
        content: `${username} reported ${target}`,
        embeds: [
            {
                title: `${target} was reported`,
                color: 0xff0000,
                fields: [
                    {
                        name: "Type",
                        value: `\`${type}\``,
                    },
                    {
                        name: "Reported by",
                        value: `${username}`,
                    },
                    {
                        name: "Target",
                        value: `${target}, (\`${targetID}\`)`,
                    },
                    {
                        name: "Reason",
                        value: `\`\`\`\n${reason}\n\`\`\``,
                    },
                ],
                author: {
                    name: target,
                    icon_url: String(
                        `${process.env.ApiURL}/api/v1/users/getpfp?username=${target}`,
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" + target,
                    ),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    });

    try {
        fetch(reportWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendMultiReportLog(username, id, target, targetID, reason) {
    const body = JSON.stringify({
        content: `${username} reported ${target}`,
        embeds: [
            {
                title: `Multiple Reports`,
                color: 0xff0000,
                fields: [
                    {
                        name: "Reporter",
                        value: `${username} (\`${id}\`)`,
                    },
                    {
                        name: "Target",
                        value: `${target} (\`${targetID}\`)`,
                    },
                    {
                        name: "Reason",
                        value: `\`\`\`\n${reason}\n\`\`\``,
                    },
                    {
                        name: "URL",
                        value: `https://penguinmod.com/profile?user=${username}`,
                    },
                ],
                author: {
                    name: target,
                    icon_url: String(
                        `${process.env.ApiURL}/api/v1/users/getpfp?username=${target}`,
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" + target,
                    ),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    });

    try {
        fetch(reportWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendAdminUserLog(
    username,
    target,
    action,
    color = 0xff0000,
    extraFields = [],
) {
    sendAdminLog(
        {
            action,
            content: `${username}: ${action}, Target: ${target}`,
            fields: [
                {
                    name: "Mod",
                    value: username,
                },
                {
                    name: "Target",
                    value: target,
                },
                ...extraFields,
                {
                    name: "URL",
                    value: `https://penguinmod.com/profile?user=${target}`,
                },
            ],
        },
        {
            name: username,
            icon_url: String(
                `${process.env.ApiURL}/api/v1/users/getpfp?username=${username}`,
            ),
            url: String("https://penguinmod.com/profile?user=" + username),
        },
        color,
    );
}

/**
 * Sends a log to the admin log channel
 * @param {Object} data - Data about the log
 * @param {String} data.action - Action that was taken
 * @param {Array<Object>} data.content - Content of the log
 * @param {Array<Object>} data.fields - Fields to include in the embed
 * @param {Object} author - Author part of log
 */
function sendAdminLog(data, author, color = 0xff0000) {
    const body = JSON.stringify({
        content: data.content,
        embeds: [
            {
                title: `${data.action}`,
                color: color,
                fields: [...data.fields],
                author,
            },
        ],
    });

    try {
        fetch(adminWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function disputeLog(
    username,
    originalID,
    originalReason,
    reply,
    projectID = 0,
    color = 0x8fdc3d,
) {
    const body = JSON.stringify({
        content: `${username} replied to moderator message`,
        embeds: [
            {
                title: `Reply by ${username}`,
                color: color,
                fields: [
                    {
                        name: "",
                        value: `\`\`\`\n${reply}\n\`\`\``,
                    },
                    {
                        name: "Message Replied to",
                        value: `\`\`\`\n${originalReason ? originalReason.message : ""}\n\`\`\``,
                    },
                    {
                        name: "Message ID",
                        value: `\`\`(${originalID})\`\``,
                    },
                    {
                        name: "Project ID (if applicable)",
                        value: `${projectID ? projectID : "(not applicable)"}`,
                    },
                ],
                author: {
                    name: username,
                    icon_url: String(
                        `${process.env.ApiURL}/api/v1/users/getpfp?username=${username}`,
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" + username,
                    ),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    });
    try {
        fetch(messagesWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function modResponse(
    approver,
    disputer,
    messageID,
    originalDispute,
    reply,
    color = 0x70066e,
) {
    const body = JSON.stringify({
        content: `${approver} responded to reply from ${disputer}`,
        embeds: [
            {
                title: `${approver} responded to a reply`,
                color: color,
                fields: [
                    {
                        name: "",
                        value: `\`\`\`\n${reply}\n\`\`\``,
                    },
                    {
                        name: "Original Reply",
                        value: `\`\`\`\n${originalDispute}\n\`\`\``,
                    },
                    {
                        name: "Message ID",
                        value: `\`(${messageID})\``,
                    },
                ],
                author: {
                    name: approver,
                    icon_url: String(
                        `${process.env.ApiURL}/api/v1/users/getpfp?username=${approver}`,
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" + approver,
                    ),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    });

    try {
        fetch(messagesWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function modMessage(approver, target, messageID, message, color = 0x70066e) {
    const body = JSON.stringify({
        content: `${approver} messaged ${target}`,
        embeds: [
            {
                title: `${approver} messaged ${target}`,
                color: color,
                fields: [
                    {
                        name: "",
                        value: `\`\`\`\n${message}\n\`\`\``,
                    },
                    {
                        name: "Message ID",
                        value: `\`(${messageID})\``,
                    },
                ],
                author: {
                    name: approver,
                    icon_url: String(
                        `${process.env.ApiURL}/api/v1/users/getpfp?username=${approver}`,
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" + approver,
                    ),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    });

    try {
        fetch(messagesWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendServerLog(text, color = 0xff0000) {
    const body = JSON.stringify({
        embeds: [
            {
                title: `Server Log`,
                color: color,
                description: `\`\`\`ansi\n${text}\n\`\`\``,
                timestamp: new Date().toISOString(),
            },
        ],
    });
    try {
        return fetch(apiUpdatesWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendCreationLog(username, id, name, type, color = 0x25da5b) {
    const body_json = {
        content:
            type === "account"
                ? `${username} created a new account`
                : type === "update"
                  ? `${username} updated a project (${name})`
                  : `${username} created a new project (${name})`,
        embeds: [
            {
                title: `${username} created a new ${type}`,
                color: color,
                fields: [
                    type === "account"
                        ? {
                              name: "Account info",
                              value: `${username} (\`${id}\`)`,
                          }
                        : {
                              name: "Project info",
                              value: `${name} (\`${id}\`)`,
                          },

                    type === "account"
                        ? {
                              name: "URL",
                              value: `https://penguinmod.com/profile?user=${username}`,
                          }
                        : {
                              name: "URL",
                              value: `https://studio.penguinmod.com/#${id}`,
                          },
                ],
                author: {
                    name: String(username).substring(0, 50),
                    icon_url: String(
                        "https://projects.penguinmod.com/api/v1/users/getpfp?username=" +
                            String(username).substring(0, 50),
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" +
                            String(username).substring(0, 50),
                    ),
                },
                description: type === "account" ? "" : `Project ID: \`${id}\``,
                timestamp: new Date().toISOString(),
            },
        ],
    };

    if (type === "upload" || type === "update") {
        const url = `https://projects.penguinmod.com/api/v1/projects/getproject?requestType=thumbnail&projectID=${id}&rnd=${Math.random()}`;
        body_json.embeds[0].image = {
            url,
        };
    }

    const body = JSON.stringify(body_json);

    try {
        fetch(creationWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

function sendFeatureLog(id, title, creator, manual = false) {
    const projectImage = String(
        `https://projects.penguinmod.com/api/v1/projects/getproject?requestType=thumbnail&projectID=${id}`,
    );
    const projectTitle = String(title).substring(0, 250);
    const body = JSON.stringify({
        content: `⭐ **${projectTitle}** has been **${manual ? "manually" : "community"} featured!** ⭐`,
        embeds: [
            {
                title: projectTitle,
                description: `Project ID: \`${id}\``,
                image: { url: projectImage },
                color: 16771677,
                url: String("https://studio.penguinmod.com/#" + String(id)),
                author: {
                    name: String(creator).substring(0, 50),
                    icon_url: String(
                        "https://projects.penguinmod.com/api/v1/users/getpfp?username=" +
                            String(creator).substring(0, 50),
                    ),
                    url: String(
                        "https://penguinmod.com/profile?user=" +
                            String(creator).substring(0, 50),
                    ),
                },
            },
        ],
    });
    try {
        fetch(featuredWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch (e) {
        console.error(e);
    }
}

const watchlist = {
    sendProjectUploadLog(id, title, creator) {
        const projectImage = String(
            `https://projects.penguinmod.com/api/v1/projects/getproject?requestType=thumbnail&projectID=${id}`,
        );
        const projectTitle = String(title).substring(0, 250);
        const body = JSON.stringify({
            content: `**${projectTitle}** has been uploaded by ${creator}`,
            embeds: [
                {
                    title: projectTitle,
                    description: `Project ID: \`${id}\``,
                    image: { url: projectImage },
                    color: 0xbf8939,
                    url: String("https://studio.penguinmod.com/#" + String(id)),
                    author: {
                        name: String(creator).substring(0, 50),
                        icon_url: String(
                            "https://projects.penguinmod.com/api/v1/users/getpfp?username=" +
                                String(creator).substring(0, 50),
                        ),
                        url: String(
                            "https://penguinmod.com/profile?user=" +
                                String(creator).substring(0, 50),
                        ),
                    },
                },
            ],
        });
        try {
            fetch(watchlistWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
            });
        } catch (e) {
            console.error(e);
        }
    },

    sendProjectUpdateLog(id, title, creator) {
        const projectImage = String(
            `https://projects.penguinmod.com/api/v1/projects/getproject?requestType=thumbnail&projectID=${id}`,
        );
        const projectTitle = String(title).substring(0, 250);
        const body = JSON.stringify({
            content: `**${projectTitle}** has been updated by ${creator}`,
            embeds: [
                {
                    title: projectTitle,
                    description: `Project ID: \`${id}\``,
                    image: { url: projectImage },
                    color: 0xbf8939,
                    url: String("https://studio.penguinmod.com/#" + String(id)),
                    author: {
                        name: String(creator).substring(0, 50),
                        icon_url: String(
                            "https://projects.penguinmod.com/api/v1/users/getpfp?username=" +
                                String(creator).substring(0, 50),
                        ),
                        url: String(
                            "https://penguinmod.com/profile?user=" +
                                String(creator).substring(0, 50),
                        ),
                    },
                },
            ],
        });
        try {
            fetch(watchlistWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
            });
        } catch (e) {
            console.error(e);
        }
    },

    sendUsernameUpdateLog(old_username, new_username, id) {
        const body = JSON.stringify({
            content: `**${old_username}** has changed their username to **${new_username}**`,
            embeds: [
                {
                    title: new_username,
                    description: `User ID: \`${id}\``,
                    color: 0xcecd77,
                    url: String(
                        "https://penguinmod.com/profile?user=" + String(id),
                    ),
                    author: {
                        name: String(new_username),
                        icon_url: String(
                            "https://projects.penguinmod.com/api/v1/users/getpfp?username=" +
                                String(new_username),
                        ),
                        url: String(
                            "https://penguinmod.com/profile?user=" +
                                String(new_username),
                        ),
                    },
                },
            ],
        });
        try {
            fetch(watchlistWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
            });
        } catch (e) {
            console.error(e);
        }
    },

    putOnWatchlist(user, admin) {
        const body = JSON.stringify({
            content: `**${user}** has been put on the watchlist by ${admin}`,
            embeds: [
                {
                    title: `${user} is now on the watchlist`,
                    color: 0xdba678,
                    url: `https://penguinmod.com/profile?user=${user}`,
                    author: {
                        name: String(admin).substring(0, 50),
                        icon_url: String(
                            "https://projects.penguinmod.com/api/v1/users/getpfp?username=" +
                                String(admin).substring(0, 50),
                        ),
                        url: String(
                            "https://penguinmod.com/profile?user=" +
                                String(admin).substring(0, 50),
                        ),
                    },
                },
            ],
        });
        try {
            fetch(watchlistWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
            });
        } catch (e) {
            console.error(e);
        }
    },
};

module.exports = {
    sendHeatLog,
    sendBioUpdateLog,
    sendReportLog,
    sendMultiReportLog,
    sendAdminUserLog,
    sendAdminLog,
    disputeLog,
    modResponse,
    modMessage,
    sendServerLog,
    sendCreationLog,
    sendFeatureLog,
    sendRenameLog,
    watchlist,
};
