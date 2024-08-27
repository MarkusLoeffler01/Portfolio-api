export class PermissionDeniedError extends Error {
    constructor() {
        super("Permission denied");
        this.name = "PermissionDeniedError";
    }
}

export class NotFoundError extends Error {
    constructor() {
        super("Not found");
        this.name = "NotFoundError";
    }
}

export class DBError extends Error {
    public type: DBAction;
    constructor(erroObj: any, type: DBAction) {
        super(erroObj);
        this.type = type;
        this.name = "DBError";
    }
}


type DBAction = "store" | "get" | "delete" | "update";