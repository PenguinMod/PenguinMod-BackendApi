import { MessageId, ProjectId, ReportId, UserId } from "./new-types";

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
    username: string;
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
    featuredProject: string;
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
    onWatchlist: boolean;
}

export interface ProjectData {
    id: ProjectId;
    author: UserId;
    title: string;
    instructions: string;
    notes: string;
    remix: string;
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
}

export interface ExtProjectData extends ProjectData {
    fromDonator: boolean;
    author: {
        username: string;
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

export interface ExtFeedItem extends FeedItem {
    id: UserId;
    username: string;
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

export interface Message {
    receiver: UserId;
    message: BaseMessage;
    disputable: boolean;
    date: number;
    read: boolean;
    id: MessageId;
    projectID: ProejctId;
}

export interface OAuthState {
    state: string;
    data: string;
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

export interface ExtReport extends Report {
    reporter: {
        id: UserId;
        username: string;
    };
}
