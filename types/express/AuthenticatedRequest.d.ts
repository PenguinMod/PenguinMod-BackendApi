import { Request } from "express";
import { Login } from "../../api/v1/db/Authentication";

export interface AuthenticatedRequest extends Request {
    login: Login;
}
