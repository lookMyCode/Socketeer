"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonStringifyPipe = void 0;
class JsonStringifyPipe {
    transform(value) {
        if (typeof value === 'string')
            return value;
        return JSON.stringify(value);
    }
}
exports.JsonStringifyPipe = JsonStringifyPipe;
