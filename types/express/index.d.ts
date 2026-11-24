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
