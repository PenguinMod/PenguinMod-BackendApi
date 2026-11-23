import { DBController } from "./DBController";
import Manager from "./Manager";

export class Users {
    db: DBController;
    manager: Manager;

    constructor(db_controller: DBController, manager: Manager) {
        this.db = db_controller;
        this.manager = manager;
    }

    async existsByUsername(
        username: string,
        showBanned: boolean = false,
    ): Promise<boolean> {
        let query: object = { username: username };
        if (!showBanned) {
            query = {
                $and: [
                    query,
                    { permBanned: false, unbanTime: { $lt: Date.now() } },
                ],
            };
        }
        const result = await this.db.users.findOne(query);

        return !!result;
    }

    async getIDByUsername(username: string): Promise<string | false> {
        username = String(username);
        const result = await this.db.users.findOne({ username });
        if (!result) {
            return false;
        }
        return result.id;
    }

    async getUsernameByID(id: string): Promise<string | false> {
        id = String(id);
        const result = await this.db.users.findOne({ id: id });

        if (!result) {
            return false;
        }

        return result.username;
    }
}
