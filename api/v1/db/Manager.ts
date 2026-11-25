import { Authentication } from "./Authentication";
import { DBController } from "./DBController";
import { Messages } from "./Messages";
import { Misc } from "./Misc";
import { Projects } from "./Projects";
import { Reports } from "./Reports";
import { Users } from "./Users";

export default class Manager {
    db: DBController;
    auth: Authentication;
    users: Users;
    projects: Projects;
    reports: Reports;
    messages: Messages;
    misc: Misc;

    constructor() {
        this.db = new DBController();
        this.auth = new Authentication(this.db, this);
        this.users = new Users(this.db, this);
        this.projects = new Projects(this.db, this);
        this.reports = new Reports(this.db, this);
        this.messages = new Messages(this.db, this);
        this.misc = new Misc(this.db, this);
    }

    async init(): Promise<void> {
        this.db.init();
    }
}
