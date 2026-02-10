"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = void 0;
const SocketeerException_1 = require("../../exception/SocketeerException");
class ZodValidationPipe {
    constructor(schema, options = {}) {
        this.schema = schema;
        this.options = options;
    }
    transform(value, context) {
        const result = this.schema.safeParse(value);
        if (!result.success) {
            if (this.options.onError && context) {
                this.options.onError(result.error, context);
                // Throw handled exception (silent failure for main flow)
                throw new SocketeerException_1.SocketeerException('Validation Handled', 400, false);
            }
            throw new SocketeerException_1.SocketeerException(JSON.stringify(result.error.issues), 400, false);
        }
        return result.data;
    }
}
exports.ZodValidationPipe = ZodValidationPipe;
