import { z } from "zod";

import {
    makeUsername,
    messageId,
    projectId,
    reportId,
    userId,
} from "./new-types";

export const ProjectIdSchema = z.string().transform(projectId);
export const UserIdSchema = z.string().transform(userId);
export const UsernameSchema = z.string().transform(makeUsername);
export const MessageIdSchema = z.string().transform(messageId);
export const ReportIdSchema = z.string().transform(reportId);

export const ProjectDataSchema = z.object({
    id: ProjectIdSchema.meta({
        description: "Unique project ID",
    }),

    author: UserIdSchema.meta({
        description: "ID of the project's author",
    }),

    title: z.string().meta({
        description: "Project title",
    }),

    instructions: z.string().meta({
        description: "Project instructions",
    }),

    notes: z.string().meta({
        description: "Project notes",
    }),

    remix: z.union([ProjectIdSchema, z.literal(""), z.literal("0")]).meta({
        description: "ID of the original project, or empty/0 if not a remix",
    }),

    featured: z.boolean(),
    views: z.number(),
    date: z.number().meta({
        description: "Creation timestamp",
    }),

    lastUpdate: z.number().meta({
        description: "Last update timestamp",
    }),

    rating: z.string(),
    public: z.boolean(),
    softRejected: z.boolean(),
    hardReject: z.boolean(),

    hardRejectTime: z.union([z.literal(0), z.date()]).meta({
        description: "Hard rejection timestamp, or 0 if not rejected",
    }),

    impressions: z.number(),
    noFeature: z.boolean(),
    authorRank: z.number(),
    loves: z.number(),
    votes: z.number(),
});

export const ExtProjectDataSchema = ProjectDataSchema.omit({
    author: true,
}).extend({
    fromDonator: z.boolean(),
    author: z.object({
        username: UsernameSchema,
        id: UserIdSchema,
    }),
});

export type ProjectData = z.infer<typeof ProjectDataSchema>;
export type ExtProjectData = z.infer<typeof ExtProjectDataSchema>;

export const UserDataSchema = z.object({
    id: UserIdSchema.meta({ description: "ID of the user" }),
    username: UsernameSchema.meta({
        description: "Username of the user, all lowercase.",
    }),
    real_username: z.string().meta({
        description: "Username of the user with capitalization kept intact",
    }),
    password: z.string().meta({ description: "Hash of the user's password" }),
    token: z.string(),
    admin: z.boolean(),
    moderator: z.boolean().meta({
        description:
            "Whether the user has been marked as an admin. Note that this can be false even if the user is an admin. Or the two fields to get a better representation of this value.",
    }),
    permBanned: z.boolean(),
    unbanTime: z.number().meta({
        description:
            "The timestamp that a temp-banned user will get unbanned. If it is greater than `Date.now()`, they are currently temp-banned",
    }),
    banReason: z.string(),
    rank: z.number().meta({
        description:
            "0 for newborn penguin, 1 for penguin. All other values are currently unused.",
    }),
    badges: z.array(z.string()),
    following: z
        .number()
        .meta({ description: "The number of users this user is following" }),
    followers: z.number(),
    bio: z.string(),
    featuredProjectTitle: z.number().meta({
        description:
            "The index to an array on the frontend. We don't store the text because it gets translated.",
    }),
    featuredProject: z.union([ProjectIdSchema, z.literal(-1)]).meta({
        description: "The project featured on this users profile. -1 if none.",
    }),
    cubes: z
        .number()
        .meta({ description: 'Concept for a "currency". Currently unused' }),
    firstLogin: z.number().meta({
        description: "Timestamp for when the user created their account",
    }),
    lastLogin: z.number().meta({
        description:
            "Timestamp for when the user last accessed the backend in any capacity where their login was sent",
    }),
    lastUpload: z.number().meta({
        description:
            "Timestamp for when the user last uploaded/updated a project",
    }),
    email: z.union([z.string(), z.literal(null)]),
    emailVerified: z.boolean(),
    birthdayEntered: z.boolean(),
    countryEntered: z.boolean(),
    birthday: z.union([z.string(), z.literal(undefined)]).meta({
        description: "ISO date string for the user's provided birthday",
    }),
    country: z.union([z.string(), z.literal(undefined)]).meta({
        description:
            "Country code for the user's provided country of residence",
    }),
    lastPrivacyPolicyRead: z.number().meta({
        description:
            "Timestamp for when this user last read the privacy policy",
    }),
    lastTOSRead: z.number().meta({
        description: "Timestamp for when this user last read the TOS",
    }),
    lastGuidelinesRead: z.number().meta({
        description:
            "Timestamp for when this user last read the uploading guidelines",
    }),
    privateProfile: z.boolean(),
    allowFollowingView: z.boolean().meta({
        description:
            "If this is a private profile, then this determines whether the users this user follows can see their profile. True = they can see",
    }),
    is_studio: z.boolean().meta({
        description: "Whether this account is a studio. Currently unused.",
    }),
    onWatchlist: z.boolean().optional().meta({
        description:
            "Whether this user is on the watchlist. Assume undefined is false",
    }),
});

export type UserData = z.infer<typeof UserDataSchema>;

export const BBUploadURLSchema = z.object({
    url: z.string(),
    token: z.string(),
    expires: z.number(),
    in_use: z.boolean(),
    index: z.string(),
});

export const BBFileActionSchema = z.enum(["start", "upload", "hide", "folder"]);

export const BBListFileNamesSchema = z.object({
    files: z.array(
        z.object({
            accountId: z.string(),
            action: BBFileActionSchema,
            bucketId: z.string(),
            contentLength: z.number(),
            contentSha1: z.string(),
            contentMd5: z.string(),
            contentType: z.string(),
            fileId: z.string(),
            fileInfo: z.record(z.string(), z.unknown()),
            fileName: z.string(),
            uploadTimestamp: z.number(),
        }),
    ),
    nextFileName: z.string(),
});

export const FeedTypeSchema = z.enum(["remix", "upload"]);

export const FeedItemSchema = z.object({
    userID: UserIdSchema,
    type: FeedTypeSchema,
    data: z.string(),
    date: z.date(),
});

export const ExtFeedItemSchema = FeedItemSchema.omit({ data: true }).extend({
    username: UsernameSchema,
    id: UserIdSchema,
    data: z.union([
        z.object({
            id: z.string(),
            username: UsernameSchema.optional(),
            name: z.string().optional(),
        }),
        z.string(),
    ]),
});

export const LoggedIPSchema = z.object({
    ip: z.string(),
    id: UserIdSchema,
    lastLogin: z.number(),
    banned: z.boolean(),
});

export const PasswordResetStateSchema = z.object({
    state: z.string(),
    email: z.string(),
    id: UserIdSchema,
    createdAt: z.date(),
});

export const EmailTypeSchema = z.enum(["reset", "verify"]);

export const SentEmailSchema = z.object({
    userid: UserIdSchema,
    userip: z.string(),
    sentAt: z.date(),
    type: EmailTypeSchema,
});

export const FollowingDataSchema = z.object({
    follower: UserIdSchema,
    target: UserIdSchema,
    active: z.boolean(),
});

export const OAuthMethodSchema = z.enum(["google", "github", "scratch"]);

export const OAuthIDSchema = z.object({
    id: UserIdSchema,
    method: OAuthMethodSchema,
    code: z.string(),
});

export const RuntimeConfigItemSchema = z.object({
    id: z.string(),
    value: z.unknown(),
});

export const ProjectInteractionSchema = z.enum(["love", "vote"]);

export const ProjectStatItemSchema = z.object({
    projectId: ProjectIdSchema,
    userId: UserIdSchema,
    type: ProjectInteractionSchema,
});

export const OAuthStateSchema = z.object({
    state: z.string(),
    data: z.union([z.string(), z.undefined()]),
    createdAt: z.date(),
});

export const OTTCodeSchema = z.object({
    _id: z.string(),
    token: z.string(),
    expiresAt: z.date(),
});

export const IllegalListEntrySchema = z.object({
    id: z.string(),
    items: z.array(z.string()),
});

export const PolicyUpdateInfoSchema = z.object({
    id: z.string(),
    lastUpdate: z.number(),
});

export const UserBlockSchema = z.object({
    blocker: UserIdSchema,
    target: UserIdSchema,
    active: z.boolean(),
    time: z.number(),
});

export const TagWeightSchema = z.object({
    user_id: UserIdSchema,
    tag: z.string(),
    weight: z.number(),
    most_recent: z.number(),
});

export const ReportTypeSchema = z.enum(["user", "project"]);

export const ReportSchema = z.object({
    type: ReportTypeSchema,
    reportee: z.union([UserIdSchema, ProjectIdSchema]),
    reason: z.string(),
    reporter: UserIdSchema,
    date: z.number(),
    id: ReportIdSchema,
    resolved: z.boolean(),
});

export const ExtReportSchema = ReportSchema.omit({ reporter: true }).extend({
    reporter: z.object({
        id: UserIdSchema,
        username: UsernameSchema,
    }),
});

const ProjectReferenceSchema = z.object({
    id: ProjectIdSchema,
    title: z.string(),
});

export const BaseMessageSchema = z.object({
    type: z.string(),
    message: z.string().optional(),
    badge: z.string().optional(),
    title: z.string().optional(),
    hardReject: z.boolean().optional(),
    previous: MessageIdSchema.optional(),
    projectID: ProjectIdSchema.optional(),
    user: UserIdSchema.optional(),
    time: z.number().optional(),
    reason: z.string().optional(),
});

export const ExtBaseMessageSchema = BaseMessageSchema.omit({
    user: true,
}).extend({
    user: z
        .union([
            UserIdSchema,
            z.object({
                id: UserIdSchema,
                username: UsernameSchema,
            }),
        ])
        .optional(),

    project: ProjectReferenceSchema.optional(),
    oldProject: ProjectReferenceSchema.optional(),
    newProject: ProjectReferenceSchema.optional(),
});

export const BaseMessageDocumentSchema = z.object({
    receiver: UserIdSchema,
    message: BaseMessageSchema,
    disputable: z.boolean(),
    date: z.number(),
    read: z.boolean(),
    id: MessageIdSchema,
    projectID: ProjectIdSchema,
    dispute: z.string().optional(),
});

export const ExtBaseMessageDocumentSchema = z.object({
    receiver: UserIdSchema,
    message: ExtBaseMessageSchema,
    disputable: z.boolean(),
    date: z.number(),
    read: z.boolean(),
    id: MessageIdSchema,
    projectID: ProjectIdSchema,
    dispute: z.string().optional(),
});

export type MessageBase = z.infer<typeof BaseMessageDocumentSchema>;
export type MessageExtBase = z.infer<typeof ExtBaseMessageDocumentSchema>;

export type Sort = z.infer<typeof SortSchema>;
export const SortSchema = z.enum([
    "newest-update",
    "newest-upload",
    "views",
    "votes",
    "loves",
]);

export type SearchInclude = z.infer<typeof SearchIncludeSchema>;
export const SearchIncludeSchema = z.enum([
    "all",
    "all-allowed",
    "ranked",
    "unranked",
    "rejected",
]);

export type OldSearchType = z.infer<typeof OldSearchTypeSchema>;
export const OldSearchTypeSchema = z.enum([
    "featured",
    "newest",
    "uploaddate",
    "views",
    "loves",
    "votes",
]);

export type BBUploadURL = z.infer<typeof BBUploadURLSchema>;
export type BBFileAction = z.infer<typeof BBFileActionSchema>;
export type BBListFileNames = z.infer<typeof BBListFileNamesSchema>;

export type FeedType = z.infer<typeof FeedTypeSchema>;
export type FeedItem = z.infer<typeof FeedItemSchema>;
export type ExtFeedItem = z.infer<typeof ExtFeedItemSchema>;

export type LoggedIP = z.infer<typeof LoggedIPSchema>;
export type PasswordResetState = z.infer<typeof PasswordResetStateSchema>;

export type EmailType = z.infer<typeof EmailTypeSchema>;
export type SentEmail = z.infer<typeof SentEmailSchema>;

export type FollowingData = z.infer<typeof FollowingDataSchema>;

export type OAuthMethod = z.infer<typeof OAuthMethodSchema>;
export type OAuthID = z.infer<typeof OAuthIDSchema>;

export type RuntimeConfigItem = z.infer<typeof RuntimeConfigItemSchema>;

export type ProjectInteraction = z.infer<typeof ProjectInteractionSchema>;
export type ProjectStatItem = z.infer<typeof ProjectStatItemSchema>;

export type BaseMessage = z.infer<typeof BaseMessageSchema>;

export type OAuthState = z.infer<typeof OAuthStateSchema>;
export type OTTCode = z.infer<typeof OTTCodeSchema>;

export type IllegalListEntry = z.infer<typeof IllegalListEntrySchema>;
export type PolicyUpdateInfo = z.infer<typeof PolicyUpdateInfoSchema>;
export type UserBlock = z.infer<typeof UserBlockSchema>;
export type TagWeight = z.infer<typeof TagWeightSchema>;

export type ReportType = z.infer<typeof ReportTypeSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ExtReport = z.infer<typeof ExtReportSchema>;

export type ExtBaseMessage = z.infer<typeof ExtBaseMessageSchema>;
