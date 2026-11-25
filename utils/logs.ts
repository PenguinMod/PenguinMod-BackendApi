import "dotenv/config";
import { BaseMessage } from "../api/v1/db/types";
import { MessageId, ProjectId, UserId } from "../api/v1/db/new-types";

type WebhookField = { name: string; value: string; inline?: boolean };
type WebhookAuthor = { name: string; icon_url?: string; url?: string };
type WebhookEmbed = {
    title?: string;
    description?: string;
    color?: number;
    fields?: WebhookField[];
    author?: WebhookAuthor;
    timestamp?: string;
    url?: string;
    image?: { url: string };
};
type WebhookPayload = { content?: string; embeds?: WebhookEmbed[] };
type AdminLogData = {
    action: string;
    content: string;
    fields: Record<string, string>;
};

const webhooks = {
    heat: process.env.HeatWebhook,
    report: process.env.ReportWebhook,
    admin: process.env.AdminWebhook,
    creation: process.env.CreationWebhook,
    featured: process.env.FeaturedWebhook,
    websiteInfo: process.env.WebsiteInfoWebhook,
    messages: process.env.MessagesWebhook,
    watchlist: process.env.WatchlistWebhook,
} satisfies Record<string, string | undefined>;

const homeUrl = process.env.HomeURL ?? "";
const studioUrl = process.env.StudioURL ?? "";
const apiUrl = process.env.ApiURL ?? "";

function profileUrl(username: string): string {
    return `${homeUrl}/profile?user=${encodeURIComponent(username)}`;
}

function projectUrl(id: ProjectId): string {
    return `${studioUrl}/#${encodeURIComponent(String(id))}`;
}

function projectThumbnailUrl(id: ProjectId, cacheBust = false): string {
    const base = `${apiUrl}/api/v1/projects/getproject?requestType=thumbnail&projectID=${encodeURIComponent(String(id))}`;
    return cacheBust ? `${base}&rnd=${Math.random()}` : base;
}

function codeBlock(value: string): string {
    return `\`\`\`\n${value.replace(/```/g, "'''")}\n\`\`\``;
}

function pmUserAuthor(username: string): WebhookAuthor {
    return {
        name: username,
        icon_url: `${apiUrl}/api/v1/users/getpfp?username=${encodeURIComponent(username)}`,
        url: profileUrl(username),
    };
}

async function postWebhook(
    url: string | undefined,
    payload: WebhookPayload,
): Promise<void> {
    if (!url) {
        console.warn("Webhook URL is not configured");
        return;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(
                `Webhook request failed: ${response.status} ${response.statusText}`,
            );
        }
    } catch (error: unknown) {
        console.error("Failed to send webhook:", error);
    }
}

function sendHeatLog(
    text: string,
    triggers: string[],
    location: string,
    user_info: unknown,
    color = 0xff0000,
): void {
    postWebhook(webhooks.heat, {
        embeds: [
            {
                title: "Filter Triggered",
                color,
                description: codeBlock(text),
                fields: [
                    { name: "Location", value: `\`${location}\`` },
                    { name: "Info", value: `\`${JSON.stringify(user_info)}\`` },
                    {
                        name: "Triggers",
                        value: `\`${JSON.stringify(triggers)}\``,
                    },
                ],
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

function sendRenameLog(
    oldUsername: string,
    newUsername: string,
    id: UserId,
): void {
    postWebhook(webhooks.websiteInfo, {
        embeds: [
            {
                title: "User has new name",
                color: 0xa185af,
                description: `${oldUsername}'s (${id}) username is now ${newUsername}`,
                fields: [
                    { name: "Old Username", value: `\`${oldUsername}\`` },
                    { name: "New Username", value: `\`${newUsername}\`` },
                    { name: "ID", value: `\`${id}\`` },
                    { name: "URL", value: profileUrl(newUsername) },
                ],
                author: pmUserAuthor(newUsername),
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

function sendReportLog(
    type: string,
    username: string,
    targetID: UserId | ProjectId,
    target: string,
    reason: string,
): void {
    postWebhook(webhooks.report, {
        content: `${username} reported ${target}`,
        embeds: [
            {
                title: `${target} was reported`,
                color: 0xff0000,
                fields: [
                    { name: "Type", value: `\`${type}\`` },
                    { name: "Reported by", value: username },
                    { name: "Target", value: `${target}, (\`${targetID}\`)` },
                    { name: "Reason", value: codeBlock(reason) },
                ],
                author: pmUserAuthor(target),
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

function sendMultiReportLog(
    username: string,
    id: UserId,
    target: string,
    targetID: UserId | ProjectId,
    reason: string,
): void {
    postWebhook(webhooks.report, {
        content: `${username} reported ${target}`,
        embeds: [
            {
                title: "Multiple Reports",
                color: 0xff0000,
                fields: [
                    { name: "Reporter", value: `${username} (\`${id}\`)` },
                    { name: "Target", value: `${target} (\`${targetID}\`)` },
                    { name: "Reason", value: codeBlock(reason) },
                    { name: "URL", value: profileUrl(username) },
                ],
                author: pmUserAuthor(target),
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

function sendAdminUserLog(
    username: string,
    target: string,
    action: string,
    color = 0xff0000,
    extraFields: Record<string, string> = {},
): void {
    sendAdminLog(
        {
            action,
            content: `${username}: ${action}, Target: ${target}`,
            fields: {
                Mod: username,
                Target: target,
                ...extraFields,
                URL: profileUrl(target),
            },
        },
        pmUserAuthor(username),
        color,
    );
}

function sendAdminLog(
    data: AdminLogData,
    author: WebhookAuthor,
    color = 0xff0000,
): void {
    postWebhook(webhooks.admin, {
        content: data.content,
        embeds: [
            {
                title: data.action,
                color,
                fields: Object.entries(data.fields).map(([name, value]) => ({
                    name,
                    value,
                })),
                author,
            },
        ],
    });
}

function disputeLog(
    username: string,
    originalID: MessageId,
    originalReason: BaseMessage,
    reply: string,
    projectID: ProjectId | null,
    color = 0x8fdc3d,
): void {
    postWebhook(webhooks.messages, {
        content: `${username} replied to moderator message`,
        embeds: [
            {
                title: `Reply by ${username}`,
                color,
                fields: [
                    { name: "\u200B", value: codeBlock(reply) },
                    {
                        name: "Message Replied to",
                        value: codeBlock(originalReason?.message ?? ""),
                    },
                    { name: "Message ID", value: `\`(${originalID})\`` },
                    {
                        name: "Project ID (if applicable)",
                        value: projectID
                            ? String(projectID)
                            : "(not applicable)",
                    },
                ],
                author: pmUserAuthor(username),
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

function modResponse(
    approver: string,
    disputer: string,
    messageID: string,
    originalDispute: string,
    reply: string,
    color = 0x70066e,
): void {
    postWebhook(webhooks.messages, {
        content: `${approver} responded to reply from ${disputer}`,
        embeds: [
            {
                title: `${approver} responded to a reply`,
                color,
                fields: [
                    { name: "\u200B", value: codeBlock(reply) },
                    {
                        name: "Original Reply",
                        value: codeBlock(originalDispute),
                    },
                    { name: "Message ID", value: `\`(${messageID})\`` },
                ],
                author: pmUserAuthor(approver),
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

function modMessage(
    approver: string,
    target: string,
    messageID: string,
    message: string,
    color = 0x70066e,
): void {
    postWebhook(webhooks.messages, {
        content: `${approver} messaged ${target}`,
        embeds: [
            {
                title: `${approver} messaged ${target}`,
                color,
                fields: [
                    { name: "\u200B", value: codeBlock(message) },
                    { name: "Message ID", value: `\`(${messageID})\`` },
                ],
                author: pmUserAuthor(approver),
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

function sendCreationLog(
    username: string,
    id: ProjectId | UserId,
    name: string,
    type: string,
    color = 0x25da5b,
): void {
    const isAccount = type === "account";
    const isProjectUpdate = type === "update";

    const embed: WebhookEmbed = {
        title: `${username} created a new ${type}`,
        color,
        fields: [
            {
                name: isAccount ? "Account info" : "Project info",
                value: isAccount
                    ? `${username} (\`${id}\`)`
                    : `${name} (\`${id}\`)`,
            },
            {
                name: "URL",
                value: isAccount
                    ? profileUrl(username)
                    : projectUrl(id as ProjectId),
            },
        ],
        author: pmUserAuthor(username),
        description: isAccount ? "" : `Project ID: \`${id}\``,
        timestamp: new Date().toISOString(),
    };

    if (type === "upload" || isProjectUpdate) {
        embed.image = { url: projectThumbnailUrl(id as ProjectId, true) };
    }

    postWebhook(webhooks.creation, {
        content: isAccount
            ? `${username} created a new account`
            : isProjectUpdate
              ? `${username} updated a project (${name})`
              : `${username} created a new project (${name})`,
        embeds: [embed],
    });
}

function sendFeatureLog(id: ProjectId, title: string, creator: string): void {
    const projectTitle = title.substring(0, 250);

    postWebhook(webhooks.featured, {
        content: `⭐ **${projectTitle}** has been featured! ⭐`,
        embeds: [
            {
                title: projectTitle,
                description: `Project ID: \`${id}\``,
                image: { url: projectThumbnailUrl(id) },
                color: 16771677,
                url: projectUrl(id),
                author: pmUserAuthor(creator),
            },
        ],
    });
}

const watchlist = {
    sendProjectUploadLog(id: ProjectId, title: string, creator: string): void {
        const projectTitle = title.substring(0, 250);
        postWebhook(webhooks.watchlist, {
            content: `**${projectTitle}** has been uploaded by ${creator}`,
            embeds: [
                {
                    title: projectTitle,
                    description: `Project ID: \`${id}\``,
                    image: { url: projectThumbnailUrl(id) },
                    color: 0xbf8939,
                    url: projectUrl(id),
                    author: pmUserAuthor(creator),
                },
            ],
        });
    },

    sendProjectUpdateLog(id: ProjectId, title: string, creator: string): void {
        const projectTitle = title.substring(0, 250);
        postWebhook(webhooks.watchlist, {
            content: `**${projectTitle}** has been updated by ${creator}`,
            embeds: [
                {
                    title: projectTitle,
                    description: `Project ID: \`${id}\``,
                    image: { url: projectThumbnailUrl(id) },
                    color: 0xbf8939,
                    url: projectUrl(id),
                    author: pmUserAuthor(creator),
                },
            ],
        });
    },

    sendUsernameUpdateLog(
        oldUsername: string,
        newUsername: string,
        id: UserId,
    ): void {
        postWebhook(webhooks.watchlist, {
            content: `**${oldUsername}** has changed their username to **${newUsername}**`,
            embeds: [
                {
                    title: newUsername,
                    description: `User ID: \`${id}\``,
                    color: 0xcecd77,
                    url: `${homeUrl}/profile?id=${encodeURIComponent(id)}`,
                    author: pmUserAuthor(newUsername),
                },
            ],
        });
    },

    putOnWatchlist(user: string, admin: string): void {
        postWebhook(webhooks.watchlist, {
            content: `**${user}** has been put on the watchlist by ${admin}`,
            embeds: [
                {
                    title: `${user} is now on the watchlist`,
                    color: 0xdba678,
                    url: profileUrl(user),
                    author: pmUserAuthor(admin),
                },
            ],
        });
    },
};

export {
    sendHeatLog,
    sendReportLog,
    sendMultiReportLog,
    sendAdminUserLog,
    sendAdminLog,
    disputeLog,
    modResponse,
    modMessage,
    sendCreationLog,
    sendFeatureLog,
    sendRenameLog,
    watchlist,
    pmUserAuthor,
};
