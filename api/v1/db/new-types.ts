// import { isValid } from "ulid";

type Guid<DataType> = string & { __guid: DataType };

function createULIDConstructor<G>(name: string): (input: string) => G {
    return function (input: string): G {
        /*
        if (!isValid(input)) {
            throw new Error(`Cannot create ${name}: invalid ulid`);
        }
        */

        return input as G;
    };
}

export type UserId = Guid<"user">;
export const userId = createULIDConstructor<UserId>("UserId");

export type ProjectId = Guid<"project">;
export function projectId(input: string): ProjectId {
    return input as ProjectId;
}

export type MessageId = Guid<"message">;
export const messageId = createULIDConstructor<MessageId>("MessageId");

export type ReportId = Guid<"report">;
export const reportId = createULIDConstructor<ReportId>("ReportId");
