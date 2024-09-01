import { queryMock, createPool, pingMock, getConnectionMock } from "../__mocks__/mariadb";

import databaseService from "../db";
import * as commentData from "../commentData";


jest.mock("../modules/envs", () => ({
    checkEnvVariables: jest.fn(() => true)
}));

import * as envs from "../modules/envs";
import { NotFoundError, PermissionDeniedError } from "../modules/exceptions";

describe('commentData', () => {
    describe('successful tests', () => { 
        beforeAll(() => {
            queryMock.mockReset();
            createPool.mockReset();
            pingMock.mockReset();
        });

        afterEach(() => {
            queryMock.mockReset();
            createPool.mockReset();
            pingMock.mockReset();
        })


        afterAll(() => {
            queryMock.mockReset();
            createPool.mockReset();
            pingMock.mockReset();
        });

        it("should fetch comments with pagination", async () => {
            const startIndex = 0;
            const count = 10;
            queryMock.mockResolvedValueOnce([{ id: 1, content: "content" }]);
            queryMock.mockResolvedValueOnce([{ totalCount: 1 }]);
            const data = await commentData.getComments(startIndex, count);
            expect(data).toBeDefined();
            expect(queryMock).toHaveBeenCalled();
        });

        it("should edit a comment successfully", async () => {
            const id = "1";
            const content = "Updated content";
            const uuid = "valid-token";
            const comment = { id, content, uuid };
            queryMock.mockResolvedValueOnce([comment]).mockResolvedValueOnce({ affectedRows: 1 });

            const result = await commentData.editComment(id, content, uuid);
            expect(result).toBeDefined();
            expect(result?.content).toBe(content);
            expect(queryMock).toHaveBeenCalledTimes(2);
        });

        it("should create a new comment", async () => {
            const comment = { author: "Author", content: "Content", uuid: "uuid" };
            queryMock.mockResolvedValueOnce({ insertId: 1 });

            await commentData.createComment(comment);

            expect(queryMock).toHaveBeenCalled();
            expect(queryMock).toHaveBeenCalledWith(expect.any(String), [comment.author, comment.content, comment.uuid]);
        });

        it("Should mark a comment as deleted", async () => {
            queryMock.mockResolvedValueOnce([{ id: 1, content: "content", deleted: false, uuid: "valid-token" }]);
            queryMock.mockResolvedValueOnce({ affectedRows: 1 });

            const id = "1";
            const result = await commentData.deleteComment(id, "valid-token");

        });

        it("Should not delete a comment if it does not exist", async () => {
            queryMock.mockResolvedValueOnce([]);
            const id = "1";
            await expect(commentData.deleteComment(id, "valid-token")).rejects.toThrow(NotFoundError);
        });

        it("Should not delete a comment if the token is invalid", async () => {
            queryMock.mockResolvedValueOnce([{ id: 1, content: "content", deleted: false, uuid: "valid-token" }]);
            const id = "1";
            await expect(commentData.deleteComment(id, "invalid-token")).rejects.toThrow(PermissionDeniedError);
        });
    });

    describe('failing tests', () => {
        beforeEach(() => {
            queryMock.mockReset();
        })
        describe('Missing environment variables', () => {
            let envSpy: jest.SpyInstance;
            beforeAll(() => {
                process.env.DB_HOST = undefined as any;
                envSpy = jest.spyOn(envs, "checkEnvVariables").mockImplementation(() => false)
            });
            afterAll(() => {
                envSpy.mockRestore();
            });

            it("Should throw an error if DB_HOST is missing", async () => {
                expect(() => databaseService.initialize()).toThrow();
            });
        });

        describe('Unhealthy connection', () => {

            it("should throw an error if connection is unhealthy", async () => {
                pingMock.mockRejectedValueOnce(new Error("Connection failed"));
                await expect(commentData.healthCheck()).resolves.toBe(false);
            });
        });

        describe('editComment with invalid token', () => {

            beforeAll(() => {
                queryMock.mockReset();
            });
            afterAll(() => {
                queryMock.mockReset();
            });
            it("should throw PermissionDeniedError if token is invalid", async () => {
                const id = "1";
                const content = "Updated content";
                const token = "invalid-token";
                const comment = { id, content, uuid: "valid-token" };
                queryMock.mockResolvedValueOnce([comment]);

                await expect(commentData.editComment(id, content, token)).rejects.toThrow(PermissionDeniedError);
                expect(queryMock).toHaveBeenCalled();
            });
        });

        describe('editComment with non-existent comment', () => {
            it("should return null if comment does not exist", async () => {
                const id = "1";
                const content = "Updated content";
                const token = "valid-token";
                queryMock.mockResolvedValueOnce([]);

                await expect(() => commentData.editComment(id, content, token)).rejects.toThrow();
                expect(queryMock).toHaveBeenCalled();
            });
        });
    });
});














interface User {
    userid: number;
    name: string;
}