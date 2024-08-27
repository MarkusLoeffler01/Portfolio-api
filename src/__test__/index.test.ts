import supertest from "supertest";
import app from "../index";


import { queryMock, createPool, pingMock, getConnectionMock } from "../__mocks__/mariadb";

import databaseService from "../db";
import * as commentData from "../commentData";


jest.mock("../modules/envs", () => ({
    checkEnvVariables: jest.fn(() => true)
}));

import * as envs from "../modules/envs";


describe('Express server', () => {
    describe("GET /", () => {
        it("should return Hello World", async () => {
            const response = await supertest(app).get("/");
            console.log(response.type);
            console.log(response.text);
            expect(response.text).toBeDefined();
        });
    });


    describe("POST /api/comment", () => {

        afterAll(() => {
            queryMock.mockClear();
        })
        it("should return 200 at first comment", async () => {
            const response = await supertest(app).post("/api/comment").set("Cookie", [

            ]).send({
                author: "test",
                content: "test"
            });
            expect(response.status).toBe(200);
        });

        it("Should make a new token if the old one is expired", async () => {
            const response = await supertest(app).post("/api/comment").set("Cookie", [
                `token=invalid;token-expiration=${new Date(0).toISOString()}`
            ]).send({
                author: "test",
                content: "test"
            });
            expect(response.status).toBe(200);
            expect(response.headers["set-cookie"][0].split(";")[0]).toMatch(/token=[^;]+/);
        });
        

        it("Should reject if no content is provided", async () => {
            const response = await supertest(app).post("/api/comment").set("Cookie", [
            ]).send({
                author: "test"
            });
            expect(response.status).toBe(400);
        });

        it("Should reject if no author is provided", async () => {
            const response = await supertest(app).post("/api/comment").set("Cookie", [
            ]).send({
                content: "test"
            });
            expect(response.status).toBe(400);
        });

        it("Should send 500 if the database is not available", async () => {
            queryMock.mockRejectedValueOnce(new Error("Database is not available"));
            const response = await supertest(app).post("/api/comment").set("Cookie", [
                `token=valid;token-expiration=${new Date().toISOString()}`
            ]).send({
                author: "test",
                content: "test"
            });
            expect(response.status).toBe(500);
        });


    });


    describe('PUT /api/comment', () => {

        beforeAll(() => {
            queryMock.mockClear();
            createPool.mockClear();
            pingMock.mockClear();
        });

        afterEach(() => {
            queryMock.mockClear();
            createPool.mockClear();
            pingMock.mockClear();
        });

        it("Should return 200 if comment is updated", async () => {
            queryMock.mockResolvedValueOnce([{ id: "1", content: "content", uuid: "valid" }]);
            const response = await supertest(app).put("/api/comment").set("Cookie", [
                `token=valid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
                content: "test"
            });
            expect(response.status).toBe(200);
        });

        it("Should return 403 if another user tries to edit a comment", async () => {
            queryMock.mockResolvedValueOnce([{ id: "1", content: "content", uuid: "valid" }]);
            const response = await supertest(app).put("/api/comment").set("Cookie", [
                `token=invalid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
                content: "test"
            });
            expect(response.status).toBe(403);
        });

        it("Should return 404 if comment is not found", async () => {
            queryMock.mockResolvedValueOnce([]);
            const response = await supertest(app).put("/api/comment").set("Cookie", [
                `token=valid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
                content: "test"
            });
            expect(response.status).toBe(404);
        });

        it("Should return 400 if no content is provided", async () => {
            const response = await supertest(app).put("/api/comment").set("Cookie", [
                `token=valid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
            });
            expect(response.status).toBe(400);
        });

        it("Should send 500 if the database is not available", async () => {
            queryMock.mockRejectedValueOnce(new Error("Database is not available"));
            const response = await supertest(app).put("/api/comment").set("Cookie", [
                `token=valid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
                content: "test"
            });
            expect(response.status).toBe(500);
        });
    });


    describe('GET /api/comment', () => {
        beforeAll(() => {
            queryMock.mockClear();
            createPool.mockClear();
            pingMock.mockClear();
        });

        afterAll(() => {
            queryMock.mockClear();
            createPool.mockClear();
            pingMock.mockClear();
        });

        it("Should return the comments", async () => {
            const mockedValue  =[{ id: "1", content: "content", uuid: "valid" }];
            queryMock.mockResolvedValueOnce(mockedValue);
            const response = await supertest(app).get("/api/comment");            
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockedValue);
        });

        it("Should send 500 if the database is not available", async () => {
            queryMock.mockRejectedValueOnce(new Error("Database is not available"));
            const response = await supertest(app).get("/api/comment");
            expect(response.status).toBe(500);
        });
    });


    describe('DELETE /api/comment', () => {
        beforeAll(() => {
            queryMock.mockClear();
            createPool.mockClear();
            pingMock.mockClear();
        });

        afterEach(() => {
            queryMock.mockClear();
            createPool.mockClear();
            pingMock.mockClear();
        });

        it("Should return 200 if comment is deleted", async () => {
            queryMock.mockResolvedValueOnce([{ id: "1", content: "content", uuid: "valid" }]);
            const response = await supertest(app).delete("/api/comment").set("Cookie", [
                `token=valid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
            });
            expect(response.status).toBe(200);
        });

        it("Should return 403 if another user tries to delete a comment", async () => {
            queryMock.mockResolvedValueOnce([{ id: "1", content: "content", uuid: "valid" }]);
            const response = await supertest(app).delete("/api/comment").set("Cookie", [
                `token=invalid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
            });
            expect(response.status).toBe(403);
        });

        it("Should return 404 if comment is not found", async () => {
            queryMock.mockResolvedValueOnce([]);
            const response = await supertest(app).delete("/api/comment").set("Cookie", [
                `token=valid;token-expiration=${new Date().toISOString()}`
            ]).send({
                id: "1",
            });
            expect(response.status).toBe(404);
        });
    });
});