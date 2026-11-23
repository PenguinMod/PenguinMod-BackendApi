import { Request } from "express";

import type { User } from "../../api/v1/db/UserManager";
import { Login } from "../../api/v1/db/Authentication";

declare global {
    namespace Express {
        interface Request {
            realIPPlain: string;
            realIP: string;
            login: Login?;
        }
    }
}

export {};
