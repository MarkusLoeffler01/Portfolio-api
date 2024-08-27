import DatabaseService from "./db";
import type Comment from "./interfaces/comment";
import { NotFoundError, PermissionDeniedError } from "./modules/exceptions";

const pool = DatabaseService.initialize();
const dbComments = new DatabaseService<Comment>(pool, "comments");
dbComments.initialConnect();


export async function healthCheck() {
    return await dbComments.healthCheck();
}

export async function getComments(startIndex: number,  count: number) {
        return dbComments.getDataByRange(startIndex, count);
}

export async function editComment(id: string, content: string, token: string) {
    const comment = await dbComments.getDataByValue("id", id) as Comment;
    if(!comment) throw new NotFoundError();
    console.log(comment);
    console.log(token);
    if(comment.uuid !== token) throw new PermissionDeniedError();
    comment.content = content;
    await dbComments.updateData({id: comment.id, content: comment.content});
    return comment;
}

export async function deleteComment(id: string, token: string) {
    const comment = await dbComments.getDataByValue("id", id) as Comment;
    if(!comment) throw new NotFoundError();
    if(comment.uuid !== token) throw new PermissionDeniedError();
    await dbComments.deleteData({id: comment.id});
    return comment;
}

export async function createComment(comment: {author: string, content: string, uuid: string}) {
    return await dbComments.insertData(comment);
}