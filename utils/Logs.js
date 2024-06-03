require('dotenv').config();

const heatWebhook = process.env.HeatWebhook;
const reportWebhook = process.env.ReportWebhook;
const modWebhook = process.env.ModWebhook;
const adminWebhook = process.env.AdminWebhook;

function sendHeatLog(text, type, location, color=0xff0000) {
    const body = JSON.stringify({
        embeds: [{
            title: `Filter Triggered`,
            color: color,
            description: `\`\`\`ansi\n${text}\n\`\`\``,
            fields: [
                {
                    name: "Type",
                    value: `\`${type}\``
                },
                {
                    name: "Location",
                    value: `${JSON.stringify(location)}`
                }
            ],
            timestamp: new Date().toISOString()
        }]
    });
    fetch(heatWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function sendBioUpdateLog(username, target, oldBio, newBio) {
    const body = JSON.stringify({
        content: `${target}'s bio was edited by ${username}`,
        embeds: [{
            title: `${target} had their bio edited`,
            color: 0xff0000,
            fields: [
                {
                    name: "Edited by",
                    value: `${username}`
                },
                {
                    name: "Old Bio",
                    value: `\`\`\`\n${oldBio}\n\`\`\``
                },
                {
                    name: "New Bio",
                    value: `\`\`\`\n${newBio}\n\`\`\``
                },
                {
                    name: "URL",
                    value: `https://penguinmod.com/profile?user=${target}`
                },
            ],
            author: {
                name: target,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + target),
                url: String("https://penguinmod.com/profile?user=" + target)
            },
            timestamp: new Date().toISOString()
        }]
    });
    fetch(adminWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function sendReportLog(username, target, reason) {
    const body = JSON.stringify({
        content: `${username} reported ${target}`,
        embeds: [{
            title: `${target} was reported`,
            color: 0xff0000,
            fields: [
                {
                    name: "Reported by",
                    value: `${username}`
                },
                {
                    name: "Reason",
                    value: `${reason}`
                },
                {
                    name: "URL",
                    value: `https://penguinmod.com/profile?user=${target}`
                }
            ],
            author: {
                name: target,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + target),
                url: String("https://penguinmod.com/profile?user=" + target)
            },
            timestamp: new Date().toISOString()
        }]
    });

    fetch(reportWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function sendMultiReportLog(username, target, reason) {
    const body = JSON.stringify({
        content: `${username} reported ${target}`,
        embeds: [{
            title: `Multiple Reports`,
            color: 0xff0000,
            fields: [
                {
                    name: "Reporter",
                    value: `${username}`
                },
                {
                    name: "Reason",
                    value: `${reason}`
                },
                {
                    name: "URL",
                    value: `https://penguinmod.com/profile?user=${username}`
                }
            ],
            author: {
                name: target,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + target),
                url: String("https://penguinmod.com/profile?user=" + target)
            },
            timestamp: new Date().toISOString()
        }]
    });

    fetch(reportWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function sendAdminUserLog(username, target, action, color=0xff0000) {
    sendAdminLog(
        {
            action,
            content: `${username}: ${action}, Target: ${target}`,
            fields: [
                {
                    name: "Mod",
                    value: username
                },
                {
                    name: "Target",
                    value: target
                },
                {
                    name: "URL",
                    value: `https://penguinmod.com/profile?user=${target}`
                }
            ]
        },
        {
            name: username,
            icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
            url: String("https://penguinmod.com/profile?user=" + username)
        },
        color
    );
}

/**
 * Sends a log to the admin log channel
 * @param {Object} data - Data about the log
 * @param {String} data.action - Action that was taken
 * @param {Array<Object>} data.content - Content of the log
 * @param {Array<Object>} data.fields - Fields to include in the embed
 * @param {Object} author - Author part of log
 * @example sendAdminLog("admin", { action: "update profanity list", content: `sssss`, fields: [{ name: "Added", value: "poopy butt face"}]}, { name: "admin", icon_url: "http://localhost:8080/api/v1/users/getpfp?username=admin", url: "https://penguinmod.com/profile?user=admin"})
 */
function sendAdminLog(data, author, color=0xff0000) {
    const body = JSON.stringify({
        content: data.content,
        embeds: [{
            title: `${data.action}`,
            color: color,
            fields: [
                ...data.fields
            ],
            author
        }]
    });

    fetch(adminWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function disputeLog(username, originalID, originalReason, reply, projectID=0, color=0x8fdc3d) {
    const body = JSON.stringify({
        content: `${username} replied to moderator message`,
        embeds: [{
            title: `Reply by ${username}`,
            color: color,
            fields: [
                {
                    name: "",
                    value: `\`\`\`\n${reply}\n\`\`\``
                },
                {
                    name: "Message Replied to",
                    value: `\`\`\`\n${originalReason ? originalReason.message : ''}\n\`\`\``
                },
                {
                    name: "Message ID",
                    value: `\`\`(${originalID})\`\``
                },
                {
                    name: "Project ID (if applicable)",
                    value: `${projectID ? projectID : '(not applicable)'}`
                },
            ],
            author: {
                name: username,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            timestamp: new Date().toISOString()
        }]
    });
    fetch(modWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function modResponse(approver, disputer, messageID, originalDispute, reply, color=0x70066e) {
    const body = JSON.stringify({
        content: `${approver} responded to reply from ${disputer}`,
        embeds: [{
            title: `${approver} responded to a reply`,
            color: color,
            fields: [
                {
                    name: "",
                    value: `\`\`\`\n${reply}\n\`\`\``
                },
                {
                    name: "Original Reply",
                    value: `\`\`\`\n${originalDispute}\n\`\`\``
                },
                {
                    name: "Message ID",
                    value: `\`(${messageID})\``
                },
            ],
            author: {
                name: approver,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + approver),
                url: String("https://penguinmod.com/profile?user=" + approver)
            },
            timestamp: new Date().toISOString()
        }]
    });
    fetch(modWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function modMessage(approver, target, messageID, message, color=0x70066e) {
    const body = JSON.stringify({
        content: `${approver} messaged ${target}`,
        embeds: [{
            title: `${approver} messaged ${target}`,
            color: color,
            fields: [
                {
                    name: "",
                    value: `\`\`\`\n${message}\n\`\`\``
                },
                {
                    name: "Message ID",
                    value: `\`(${messageID})\``
                }
            ],
            author: {
                name: approver,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + approver),
                url: String("https://penguinmod.com/profile?user=" + approver)
            },
            timestamp: new Date().toISOString()
        }]
    });
    fetch(modWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

module.exports = {
    sendHeatLog,
    sendBioUpdateLog,
    sendReportLog,
    sendMultiReportLog,
    sendAdminUserLog,
    sendAdminLog,
    disputeLog,
    modResponse,
    modMessage
};