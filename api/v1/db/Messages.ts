import { ulid } from "ulid";
import { DBController } from "./DBController";
import Manager from "./Manager";
import {
    messageId,
    MessageId,
    projectId,
    ProjectId,
    UserId,
} from "./new-types";
import { BaseMessage, ExtBaseMessage, Message } from "./types";
import * as mongodb from "mongodb";

export class Messages {
    db: DBController;
    manager: Manager;

    constructor(db: DBController, manager: Manager) {
        this.db = db;
        this.manager = manager;
    }

    async getRecentDisputes(
        page: number,
        pageSize: number,
    ): Promise<Message<BaseMessage>[]> {
        return await this.db.messages
            .aggregate<Message<BaseMessage>>([
                {
                    $match: {
                        dispute: { $exists: true, $ne: "" },
                    },
                },
                {
                    $lookup: {
                        from: this.db.messages.collectionName,
                        let: { currentId: "$id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            "$message.previous",
                                            "$$currentId",
                                        ],
                                    },
                                },
                            },
                            {
                                $limit: 1,
                            },
                        ],
                        as: "previousReferences",
                    },
                },
                {
                    $match: {
                        "previousReferences.0": { $exists: false },
                    },
                },
                {
                    $sort: {
                        date: -1,
                    },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $project: {
                        previousReferences: 0,
                    },
                },
            ])
            .toArray();
    }

    async getMessageThread(
        messageId: MessageId,
    ): Promise<Message<BaseMessage>[] | null> {
        const message = await this.db.messages.findOne({ id: messageId });

        if (!message) {
            return null;
        }

        const prev = message.message.previous
            ? (await this.getMessageThreadPrev(message.message.previous)) || []
            : [];
        const post = await this.getMessageThreadPost(messageId);

        return [...prev, message, ...post];
    }

    async getMessageThreadPrev(
        messageId: MessageId,
    ): Promise<Message<BaseMessage>[] | null> {
        const message = await this.db.messages.findOne({ id: messageId });

        if (!message) {
            return null;
        }

        return message.message.previous
            ? [
                  ...((await this.getMessageThreadPrev(
                      message.message.previous,
                  )) || []),
                  message,
              ]
            : [message];
    }

    async getMessageThreadPost(
        messageId: MessageId,
    ): Promise<Message<BaseMessage>[]> {
        const message = await this.db.messages.findOne({
            "message.previous": messageId,
        });
        return message
            ? [message, ...(await this.getMessageThreadPost(message.id))]
            : [];
    }

    async sendMessage(
        receiver: UserId,
        message: BaseMessage,
        disputable: boolean,
        projectID: ProjectId = projectId(""),
    ): Promise<MessageId> {
        const id = messageId(ulid());

        await this.db.messages.insertOne({
            receiver: receiver,
            message: message,
            disputable: disputable,
            date: Date.now(),
            read: false,
            id: id,
            projectID: projectID,
        });

        return id;
    }

    async _getMessages(
        page: number,
        pageSize: number,
        match: mongodb.Document,
    ): Promise<Message<ExtBaseMessage>[]> {
        const join = (
            from: string,
            localField: string,
            as: string,
        ): mongodb.Document => ({
            $lookup: { from, localField, foreignField: "id", as },
        });
        const project = { id: "$projectID", title: { $first: "$p.title" } };

        return await this.db.messages
            .aggregate<Message<ExtBaseMessage>>([
                match,
                { $sort: { date: -1 } },
                { $skip: page * pageSize },
                { $limit: pageSize },

                join("users", "message.user", "u"),
                join("projects", "projectID", "p"),
                join("projects", "message.projectID", "op"),

                {
                    $set: {
                        message: {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $eq: [
                                                "$message.type",
                                                "followerAdded",
                                            ],
                                        },
                                        then: {
                                            type: "$message.type",
                                            user: {
                                                id: "$message.user",
                                                username: {
                                                    $first: "$u.username",
                                                },
                                            },
                                        },
                                    },
                                    {
                                        case: {
                                            $in: [
                                                "$message.type",
                                                ["projectFeatured", "restored"],
                                            ],
                                        },
                                        then: {
                                            type: "$message.type",
                                            project,
                                        },
                                    },
                                    {
                                        case: {
                                            $eq: ["$message.type", "reject"],
                                        },
                                        then: {
                                            $mergeObjects: [
                                                "$message",
                                                {
                                                    project: {
                                                        id: "$projectID",
                                                        title: {
                                                            $cond: [
                                                                "$message.hardReject",
                                                                "$message.title",
                                                                {
                                                                    $first: "$p.title",
                                                                },
                                                            ],
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                    {
                                        case: {
                                            $eq: ["$message.type", "remix"],
                                        },
                                        then: {
                                            type: "$message.type",
                                            oldProject: {
                                                id: "$message.projectID",
                                                title: { $first: "$op.title" },
                                            },
                                            newProject: project,
                                        },
                                    },
                                ],
                                default: "$message",
                            },
                        },
                    },
                },
                { $unset: ["u", "p", "op"] },
            ])
            .toArray();
    }

    async getMessages(
        receiver: UserId,
        page: number,
        pageSize: number,
    ): Promise<Message<ExtBaseMessage>[]> {
        return await this._getMessages(page, pageSize, {
            $match: { receiver },
        });
    }

    async getMessageCount(receiver: UserId): Promise<number> {
        return await this.db.messages.countDocuments({
            receiver: receiver,
        });
    }

    async getMessage(
        messageID: MessageId,
    ): Promise<Message<BaseMessage> | null> {
        return await this.db.messages.findOne({ id: messageID });
    }

    async getUnreadMessages(
        receiver: UserId,
        page: number,
        pageSize: number,
    ): Promise<Message<ExtBaseMessage>[]> {
        return await this._getMessages(page, pageSize, {
            $match: { receiver: receiver, read: false },
        });
    }

    async getUnreadMessageCount(receiver: UserId): Promise<number> {
        return await this.db.messages.countDocuments({
            receiver: receiver,
            read: false,
        });
    }

    async markMessageAsRead(
        id: MessageId,
        owner: UserId,
        read: boolean,
    ): Promise<boolean> {
        return (
            (
                await this.db.messages.updateOne(
                    { id: id, receiver: owner },
                    { $set: { read: read } },
                )
            ).matchedCount > 0
        );
    }

    async messageExists(id: MessageId): Promise<boolean> {
        const result = await this.db.messages.findOne({ id: id });

        return !!result;
    }

    async markAllMessagesAsRead(receiver: UserId): Promise<void> {
        await this.db.messages.updateMany(
            { receiver: receiver },
            { $set: { read: true } },
        );
    }

    async deleteMessage(id: MessageId): Promise<void> {
        await this.db.messages.deleteOne({ id: id });
    }

    async dispute(id: MessageId, dispute: string): Promise<void> {
        await this.db.messages.updateOne(
            { id: id },
            { $set: { dispute: dispute, disputable: false } },
        );
    }
}
