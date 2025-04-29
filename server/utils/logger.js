// utils/logger.js
// Basic console logger with levels

const logger = {
    info: (message, ...optionalParams) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...optionalParams);
    },
    warn: (message, ...optionalParams) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...optionalParams);
    },
    error: (message, ...optionalParams) => {
        // Log full error object if passed
        const errorParam = optionalParams.find(p => p instanceof Error || (p && p.stack));
        if (errorParam) {
             console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, errorParam);
        } else {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...optionalParams);
        }
    },
     // Keep MCP separate for potential different handling later
    mcp: (userId, courseId, eventType, data) => {
        console.log(`[MCP LOG] User: ${userId}, Course: ${courseId || 'N/A'}, Event: ${eventType}, Time: ${new Date().toISOString()}, Data: ${JSON.stringify(data)}`);
    }
};

module.exports = logger;