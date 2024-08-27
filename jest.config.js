/**@type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ['**/__test__/**/*.test.ts'],
    coverageProvider: 'v8',
    collectCoverage: true,
    setupFiles: ["<rootDir>/src/__test__/setup.ts"],
    collectCoverageFrom: ['src/**/*.ts'],
    coveragePathIgnorePatterns: [
      "node_modules",
      "src/interfaces",
      "src/modules/envs.ts"
    ]
};