// __mocks__/mariadb.ts

import { Pool, PoolConnection } from 'mariadb';

// Mock implementation of query and other methods as needed
export const queryMock = jest.fn().mockResolvedValue([]);
export const releaseMock = jest.fn();
export const pingMock = jest.fn().mockResolvedValue(undefined);

// Create a mock connection object with typed methods
const mockConnection: Partial<PoolConnection> = {
    query: queryMock,
    release: releaseMock,
    ping: pingMock,
};

// Mock implementation of getConnection
export const getConnectionMock = jest.fn().mockResolvedValue(mockConnection);

// Mock pool object with typed methods
const mockPool: Partial<Pool> = {
    getConnection: getConnectionMock,
};

// Mock implementation of createPool to return the mock pool object
export const createPool = jest.fn(() => mockPool);

const mariadb = {
    createPool: createPool
}

export default mariadb;