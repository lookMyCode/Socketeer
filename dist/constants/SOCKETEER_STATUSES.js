"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKETEER_STATUSES = void 0;
exports.SOCKETEER_STATUSES = Object.freeze({
    OK: {
        code: 4200,
        status: 'OK',
    },
    CREATED: {
        code: 4201,
        status: 'Created',
    },
    BAD_REQUEST: {
        code: 4400,
        status: 'Bad Request',
    },
    UNAUTHORIZED: {
        code: 4401,
        status: 'Unauthorized',
    },
    ACCESS_DENIED: {
        code: 4403,
        status: 'Access Denied',
    },
    NOT_FOUND: {
        code: 4404,
        status: 'Not Found',
    },
    INTERNAL_SERVER_ERROR: {
        code: 4500,
        status: 'Internal Server Error',
    },
    TOO_MANY_REQUESTS: {
        code: 4429,
        status: 'Too Many Requests',
    },
    SERVICE_UNAVAILABLE: {
        code: 4503,
        status: 'Service Unavailable',
    },
});
