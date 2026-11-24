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
import { BaseMessage, Message } from "./types";

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
    ): Promise<Message[]> {
        return await this.db.messages
            .aggregate<Message>([
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

    async getMessageThread(messageId: MessageId): Promise<Message[] | null> {
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
    ): Promise<Message[] | null> {
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

    async getMessageThreadPost(messageId: MessageId): Promise<Message[]> {
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

    /**
     * Get messages sent to a person
     * @param {string} receiver ID of the person receiving the message
     * @param {number} page page of messages to get
     * @param {number} pageSize amount of messages to get
     * @returns {Promise<Array<Object>>} Array of the messages sent to the person
     * @async
     */
    async getMessages(
        receiver: UserId,
        page: number,
        pageSize: number,
    ): Promise<Message[]> {
        return await this.db.messages
            .aggregate<Message>([
                {
                    $match: { receiver: receiver },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
            ])
            .toArray();
    }

    /**
     * Get the amount of messages sent to a person
     * @param {string} receiver ID of the person who received the messages
     * @returns {Promise<number>} Amount of messages sent to the person
     */
    async getMessageCount(receiver: UserId): Promise<number> {
        return await this.db.messages.countDocuments({
            receiver: receiver,
        });
    }

    async getMessage(messageID: MessageId): Promise<Message | null> {
        return await this.db.messages.findOne({ id: messageID });
    }

    /**
     * Get unread messages sent to a person
     * @param {string} receiver ID of the person you're getting the messages from
     * @returns {Promise<Array<Object>>} Array of the unread messages sent to the person
     * @async
     */
    async getUnreadMessages(
        receiver: UserId,
        page: number,
        pageSize: number,
    ): Promise<Message[]> {
        return await this.db.messages
            .aggregate<Message>([
                {
                    $match: { receiver: receiver, read: false },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
            ])
            .toArray();
    }

    async getUnreadMessageCount(receiver: UserId): Promise<number> {
        return await this.db.messages.countDocuments({
            receiver: receiver,
            read: false,
        });
    }

    /**
     * Mark a message as read
     * @param {string} id ID of the message
     * @param {boolean} read Toggle between read and not read
     */
    async markMessageAsRead(id: MessageId, read: boolean): Promise<void> {
        await this.db.messages.updateOne({ id: id }, { $set: { read: read } });
    }

    async messageExists(id: MessageId): Promise<boolean> {
        const result = await this.db.messages.findOne({ id: id });

        return !!result;
    }

    /**
     * Mark all messages sent to a user as read
     * @param {string} receiver ID of the person receiving the messages
     */
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
