type Comment = {
    id: string;
    content: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
    uuid: string;
    profilePicture: string;
}

export default Comment;