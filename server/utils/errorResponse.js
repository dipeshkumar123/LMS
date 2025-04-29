// utils/errorResponse.js

class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message); // Call parent class constructor (Error)
        this.statusCode = statusCode;
        this.name = this.constructor.name; // Set the error name

        // Capture stack trace, excluding constructor call from it (optional)
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { ErrorResponse }; // Export named export