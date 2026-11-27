import { MessageId, ProjectId, ReportId, UserId, Username } from "./new-types";

export interface BBUploadURL {
    url: string;
    token: string;
    expires: number;
    in_use: boolean;
    index: string;
}

export type BBFileAction = "start" | "upload" | "hide" | "folder";

export interface BBListFileNames {
    files: {
        accountId: string;
        action: BBFileAction;
        bucketId: string;
        contentLength: number;
        contentSha1: string;
        contentMd5: string;
        contentType: string;
        fileId: string;
        fileInfo: object;
        fileName: string;
        uploadTimestamp: number;
    }[];
    nextFileName: string;
}

export interface UserData {
    id: UserId;
    username: Username;
    real_username: string;
    password: string;
    token: string;
    admin: boolean;
    moderator: boolean;
    permBanned: boolean;
    unbanTime: number;
    banReason: string;
    rank: number;
    badges: string[];
    following: number;
    followers: number;
    bio: string;
    featuredProjectTitle: number;
    featuredProject: ProjectId;
    cubes: number;
    firstLogin: number;
    lastLogin: number;
    lastUpload: number;
    email: string | null;
    emailVerified: boolean;
    birthdayEntered: boolean;
    countryEntered: boolean;
    birthday: string | undefined;
    country: string | undefined;
    lastPrivacyPolicyRead: number;
    lastTOSRead: number;
    lastGuidelinesRead: number;
    privateProfile: boolean;
    allowFollowingView: boolean;
    is_studio: boolean;
    onWatchlist?: boolean;
}

export interface ProjectData {
    id: ProjectId;
    author: UserId;
    title: string;
    instructions: string;
    notes: string;
    // TODO: run a script to make all "0" remixes become "" remixes or maybe just make it null
    remix: ProjectId | "" | "0";
    featured: boolean;
    views: number;
    date: number;
    lastUpdate: number;
    rating: string;
    public: boolean;
    softRejected: boolean;
    hardReject: boolean;
    hardRejectTime: 0 | Date;
    impressions: number;
    noFeature: boolean;
    authorRank: number;
    loves: number;
    votes: number;
}

export interface ExtProjectData extends Omit<ProjectData, "author"> {
    fromDonator: boolean;
    author: {
        username: Username;
        id: UserId;
    };
}

export type FeedType = "remix" | "upload";

export interface FeedItem {
    userID: UserId;
    type: FeedType;
    data: string;
    date: Date;
}

export interface ExtFeedItem extends Omit<FeedItem, "data"> {
    username: Username;
    id: UserId;
    data:
        | {
              id: string;
              username?: Username;
              name?: string;
          }
        | string;
}

export interface LoggedIP {
    ip: string;
    id: UserId;
    lastLogin: number;
    banned: boolean;
}

export interface PasswordResetState {
    state: string;
    email: string;
    id: UserId;
    createdAt: Date;
}

export type EmailType = "reset" | "verify";

export interface SentEmail {
    userid: UserId;
    userip: string;
    sentAt: Date;
    type: EmailType;
}

export interface FollowingData {
    follower: UserId;
    target: UserId;
    active: boolean;
}

export type OAuthMethod = "google" | "github" | "scratch";

export interface OAuthID {
    id: UserId;
    method: OAuthMethod;
    code: string;
}

export interface RuntimeConfigItem {
    id: string;
    value: unknown;
}

export type ProjectInteraction = "love" | "vote";

export interface ProjectStatItem {
    projectId: ProjectId;
    userId: UserId;
    type: ProjectInteraction;
}

export interface BaseMessage {
    type: string;
    message?: string;
    badge?: string;
    title?: string;
    hardReject?: boolean;
    previous?: MessageId;
    projectID?: ProjectId;
    user?: UserId;
    time?: number;
    reason?: string;
}

export interface Message<Base> {
    receiver: UserId;
    message: Base;
    disputable: boolean;
    date: number;
    read: boolean;
    id: MessageId;
    projectID: ProjectId;
    dispute?: string;
}

export interface OAuthState {
    state: string;
    data: string | undefined;
    createdAt: Date;
}

export interface OTTCode {
    _id: string;
    token: string;
    expiresAt: Date;
}

export interface IllegalListEntry {
    id: string;
    items: string[];
}

export interface PolicyUpdateInfo {
    id: string;
    lastUpdate: number;
}

export interface UserBlock {
    blocker: UserId;
    target: UserId;
    active: boolean;
    time: number;
}

export interface TagWeight {
    user_id: UserId;
    tag: string;
    weight: number;
    most_recent: number;
}

export type ReportType = "user" | "project";

export interface Report {
    type: ReportType;
    reportee: UserId | ProjectId;
    reason: string;
    reporter: UserId;
    date: number;
    id: ReportId;
    resolved: boolean;
}

export interface ExtReport extends Omit<Report, "reporter"> {
    reporter: {
        id: UserId;
        username: Username;
    };
}

export interface ExtBaseMessage extends Omit<BaseMessage, "user"> {
    user?:
        | UserId
        | {
              id: UserId;
              username: Username;
          };
    project?: {
        id: ProjectId;
        title: string;
    };
    oldProject?: {
        id: ProjectId;
        title: string;
    };
    newProject?: {
        id: ProjectId;
        title: string;
    };
}

export type Sort =
    "newest-update" | "newest-upload" | "views" | "votes" | "loves";

export type SearchInclude =
    "all" | "all-allowed" | "ranked" | "unranked" | "rejected";

export type OldSearchType =
    "featured" | "newest" | "uploaddate" | "views" | "loves" | "votes";
