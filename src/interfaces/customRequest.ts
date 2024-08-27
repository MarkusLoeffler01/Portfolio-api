import { Request } from 'express';

type CustomRequest = Request & {
    cookie: string;
}

export default CustomRequest;