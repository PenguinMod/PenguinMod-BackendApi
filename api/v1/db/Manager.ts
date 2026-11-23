import { Authentication } from "./Authentication";
import { DBController } from "./DBController";
import { Users } from "./Users";

export default class Manager {
    db: DBController;
    auth: Authentication;
    users: Users;

    constructor() {
        this.db = new DBController();
        this.auth = new Authentication(this.db, this);
        this.users = new Users(this.db, this);
    }

    async init() {
        this.db.init();
    }
}
