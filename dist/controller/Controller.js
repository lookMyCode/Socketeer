"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = void 0;
const ErrorFilter_1 = require("../filter/ErrorFilter");
const SOCKETEER_STATUSES_1 = require("../constants/SOCKETEER_STATUSES");
const RateLimiter_1 = require("../RateLimiter");
const RateLimitException_1 = require("../exception/RateLimitException");
class Controller {
    constructor(config) {
        this.__onSocketDestroyCb = () => { };
        this.__contexts = [];
        this.__errorFilter = new ErrorFilter_1.ErrorFilter();
        const { connectGuards, requestMessagePipes, responseMessagePipes, params, queryParams, errorFilter, onSocketDestroyCb, pathNotifier, currentPath, } = config;
        const _this = this;
        this.__connectGuards = connectGuards || [];
        this.__requestMessagePipes = requestMessagePipes || [];
        this.__responseMessagePipes = responseMessagePipes || [];
        this.__params = params;
        this.__queryParams = queryParams;
        this.__pathNotifier = pathNotifier;
        this.__currentPath = currentPath;
        if (errorFilter)
            this.__errorFilter = errorFilter;
        if (onSocketDestroyCb)
            this.__onSocketDestroyCb = onSocketDestroyCb;
        if (config.rateLimit) {
            this.__rateLimiter = new RateLimiter_1.RateLimiter(config.rateLimit);
        }
        if (_this.$onSocketInit) {
            try {
                _this.$onSocketInit();
            }
            catch (err) {
                this.__errorFilter.handleError(err);
            }
        }
    }
    $subscribePathNotifications(cb) {
        return this.__pathNotifier.subscribe(this.__currentPath, cb);
    }
    $notifyPath(path, data) {
        let p = path;
        if (!p.startsWith('/'))
            p = '/' + p;
        this.__pathNotifier.notify(p, data);
    }
    $getParams() {
        return { ...this.__params };
    }
    $getQueryParams() {
        return { ...this.__queryParams };
    }
    $forEachContext(cb) {
        this.__contexts.forEach(cb);
    }
    async __addSocket(context) {
        try {
            this.__contexts.push(context);
            await this.__addEventsListeners(context);
            await this.__onSocketConnect(context);
        }
        catch (err) {
            this.__errorFilter.handleError(err, context.socket);
        }
    }
    async $send(context, msg) {
        try {
            let message = msg;
            const pipes = this.__responseMessagePipes;
            for (let i = 0, l = pipes.length; i < l; i++) {
                const pipe = pipes[i];
                try {
                    message = await pipe.transform(message, context); // Pipes might need context too
                }
                catch (err) {
                    this.__errorFilter.handleError(err, context.socket);
                    return;
                }
            }
            context.socket.send(message);
        }
        catch (err) {
            this.__errorFilter.handleError(err, context.socket);
        }
    }
    async $sendBroadcastMessage(msg) {
        try {
            this.__contexts.forEach(async (ctx) => {
                // Transform per context? Or once? 
                // Pipes transform might depend on context (e.g. user language).
                // Safer to run per context, but slower. 
                // Let's run once for now as per original implementation, but existing implementation didn't have context in transform.
                // Pass undefined as context for broadcast transform? Or first context?
                // Original code: await pipe.transform(message);
                // I'll keep it simple for now, but pipes signature changed? No, I haven't changed Pipe interface yet.
                // I should change Pipe interface to accept context.
                this.$send(ctx, msg);
            });
        }
        catch (err) {
            this.__errorFilter.handleError(err);
        }
    }
    async __addEventsListeners(context) {
        const ws = context.socket;
        ws.on('error', (err) => {
            try {
                this.__onSocketError.call(this, err, context);
            }
            catch (err) {
                this.__errorFilter.handleError(err);
            }
        });
        ws.on('close', (code, reason) => {
            try {
                this.__onSocketClose.call(this, code, reason, context);
            }
            catch (err) {
                this.__errorFilter.handleError(err);
            }
        });
        ws.on('message', message => {
            try {
                this.__onSocketMessage.call(this, message, context);
            }
            catch (err) {
                this.__errorFilter.handleError(err, ws);
            }
        });
    }
    async __onSocketConnect(context) {
        try {
            const _this = this;
            const guards = this.__connectGuards || [];
            // Check Rate Limit (Max Connections) - Moved to WSServer?
            // WSServer handles Max Connections (rejects new connection).
            // Here we handle requests rate limit. Or maybe connection limit per controller?
            // Plan said: WSServer checks Max Connections.
            // Guards check
            try {
                let accessDenied = false;
                for (let i = 0, l = guards.length; i < l; i++) {
                    const guard = guards[i];
                    const canActivate = await guard.canActivate(context);
                    if (!canActivate) {
                        accessDenied = true;
                        break;
                    }
                }
                if (accessDenied) {
                    context.socket.close(SOCKETEER_STATUSES_1.SOCKETEER_STATUSES.ACCESS_DENIED.code, SOCKETEER_STATUSES_1.SOCKETEER_STATUSES.ACCESS_DENIED.status);
                    return;
                }
            }
            catch (err) {
                // ... error handling
                throw err;
            }
            if (_this.$onSocketConnect)
                _this.$onSocketConnect(context);
        }
        catch (err) {
            this.__errorFilter.handleError(err, context.socket);
        }
    }
    __onSocketError(err, context) {
        try {
            if (this.$onSocketError)
                this.$onSocketError(err, context);
        }
        catch (e) {
            this.__errorFilter.handleError(e);
        }
    }
    async __onSocketClose(code, reason, context) {
        try {
            if (this.$onSocketClose)
                await this.$onSocketClose(code, reason, context);
            this.__contexts = this.__contexts.filter(c => c !== context);
            if (!this.__contexts.length)
                this.__onSocketDestroy();
        }
        catch (err) {
            this.__errorFilter.handleError(err);
        }
    }
    async __onSocketMessage(message, context) {
        // Rate Limit Check
        if (this.__rateLimiter) {
            if (!this.__rateLimiter.check(context)) {
                throw new RateLimitException_1.RateLimitException();
            }
        }
        let msg = message;
        const pipes = this.__requestMessagePipes;
        for (let i = 0, l = pipes.length; i < l; i++) {
            const pipe = pipes[i];
            try {
                msg = await pipe.transform(msg, context); // Pass context to pipes
            }
            catch (err) {
                // Pipe error -> ErrorFilter w/ context
                this.__errorFilter.handleError(err, context.socket);
                return;
            }
        }
        try {
            if (this.$onSocketMessage)
                this.$onSocketMessage(msg, context);
        }
        catch (err) {
            this.__errorFilter.handleError(err, context.socket);
        }
    }
    __onSocketDestroy() {
        const t = this;
        if (t.$onSocketDestroy)
            t.$onSocketDestroy();
        try {
            this.__pathNotifier.clear(this.__currentPath);
        }
        catch (_) { }
        this.__onSocketDestroyCb();
    }
}
exports.Controller = Controller;
