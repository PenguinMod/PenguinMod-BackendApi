declare global {
    namespace Express {
        interface Request {
            realIPPlain: string;
            realIP: string;
        }
    }
}

export {};
