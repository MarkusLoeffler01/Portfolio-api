import express, { Request, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();


import * as commentDb from "./commentData";
import { NotFoundError, PermissionDeniedError } from './modules/exceptions';

import type CustomRequest from "./interfaces/customRequest";
import type Comment from './interfaces/comment';
import type { PaginationParams } from './interfaces/pagination';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

declare module 'express-serve-static-core' {
    interface Request {
        //@ts-ignore
        cookies: {
            token: string;
        }
        pagination?: PaginationParams;
    }
}


interface RequestWithPagination extends Request {
    pagination?: PaginationParams;
}

const paginate = (req: RequestWithPagination, res: any, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.max(1, parseInt(req.query.perPage as string, 10) || 10);
    req.pagination = { page, perPage };

    next();
};

app.use((req: Request, res, next) => {
    function makeToken(token?: string) {
        const expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        token = token ?? uuidv4();

        res.cookie('token', token, {
            httpOnly: true,
            domain: "localhost",
            /* c8 ignore next 3 */
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            //Disable https in development
            secure: process.env.NODE_ENV === 'production',
            maxAge: 365 * 24 * 60 * 60 * 1000 //Token should be valid for a year
        });
        res.cookie("token-expiration", expirationDate.toISOString(), {
            httpOnly: true,
            domain: "localhost",
            /* c8 ignore next */
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            secure: process.env.NODE_ENV === 'production',
        });
        req.cookies.token = token;
    }
    const token = req.cookies.token;
    const tokenExpiration = req.cookies["token-expiration"];
    res.setHeader("Content-Type", "text/plain");
    if(!token || !tokenExpiration) makeToken();
    else {
        const expirationDate = new Date(tokenExpiration);
        if(expirationDate.getTime() < Date.now()) {
            const newToken = uuidv4();
            // Check age of cookie
            // If older than 6 months, renew cookie
            if(expirationDate.getTime() < Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) {
                makeToken(newToken);
            }
        }
    }
    next();
})

app.get('/', (req, res) => {
    res.header("Content-Type", "text/plain");
  res.send('Hello World');
});


app.get("/api/comment", paginate, async (req, res) => {
    try {
        const { page, perPage } = req.pagination!;


        const comments = await commentDb.getComments(page, perPage);

        res.header("Content-Type", "application/json");

        res.json({
            data: comments.data,
            total: comments.totalCount,
            page,
            perPage,
            pages: Math.ceil(comments.totalCount / perPage)
        });
    } catch(e) {
        console.error(e);
        res.status(500).send("Internal Server Error");
    }
});

app.put("/api/comment", async (req: Request<{}, {}, Partial<Comment>>, res) => {
    const { content, id } = req.body;
    const token = req.cookies.token;

    if(!["content", "id"].every(i => i in req.body)) return res.status(400).send("Bad Request: Missing properties");

    try {
        await commentDb.editComment(id!, content!, token);
        res.header("Content-Type", "text/plain");
        res.status(200).end("Comment updated");
    } catch(e) {
        if(e instanceof PermissionDeniedError) return res.status(403).send("Forbidden: Permission denied");
        if(e instanceof NotFoundError) return res.status(404).send("Not Found: Comment not found");
        res.status(500).send("Internal Server Error");
    }
});

app.post("/api/comment", async (req: Request<{}, {}, Partial<Comment>>, res) => {

    const { author, content } = req.body;
    const token = req.cookies.token;

    if(!content) return res.status(400).send("Bad Request: No comment provided");
    if(!author) return res.status(400).send("Bad Request: No comment provided");

    try {
        await commentDb.createComment({ author, content, uuid: token});
        res.header("Content-Type", "text/plain");
        res.status(200).end("Comment created");
    } catch(e) {
        res.status(500).send("Internal Server Error");
    }
});

app.delete("/api/comment", async (req: Request<{}, {}, Partial<Comment>>, res) => {
    const { id } = req.body;
    const token = req.cookies.token;
    if(!id) return res.status(400).send("Bad Request: No comment provided");

    try {
        await commentDb.deleteComment(id!, token);
        res.header("Content-Type", "text/plain");
        res.status(200).end("Comment deleted");
    } catch(e) {
        if(e instanceof PermissionDeniedError) return res.status(403).send("Forbidden: Permission denied");
        if(e instanceof NotFoundError) return res.status(404).send("Not Found: Comment not found");
        /* c8 ignore next 2 */
        res.status(500).send("Internal Server Error");
    }

});

/* c8 ignore start */
if(process.env.NODE_ENV !== "test") app.listen(PORT,  () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
/* c8 ignore end */

export default app;