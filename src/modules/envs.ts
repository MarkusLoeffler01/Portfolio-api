export function checkEnvVariables() {
    return [
        "DB_HOST",
        "DB_USER",
        "DB_PASS",
        "DB_NAME",
        "DB_PORT",
    ].every((key) =>!!process.env[key]);
}