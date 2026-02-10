"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFilter = void 0;
const WebSocket = __importStar(require("ws"));
const SocketeerException_1 = require("../exception/SocketeerException");
class ErrorFilter {
    handleError(err, ws) {
        if (err instanceof SocketeerException_1.SocketeerException) {
            if (err.close && ws) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(err.code, err.message);
                }
            }
            else if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    event: 'error',
                    data: {
                        message: err.message,
                        code: err.code,
                    }
                }));
            }
            return;
        }
        console.error(err);
    }
}
exports.ErrorFilter = ErrorFilter;
