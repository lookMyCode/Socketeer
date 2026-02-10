"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notifier = void 0;
class Notifier {
    constructor() {
        this.notifications = {};
    }
    subscribe(path, cb) {
        if (!this.notifications[path])
            this.notifications[path] = [];
        this.notifications[path].push(cb);
        return {
            unsubscribe: () => {
                this.notifications[path] = this.notifications[path].filter(c => c !== cb);
            }
        };
    }
    notify(path, data) {
        if (!this.notifications[path])
            return;
        this.notifications[path].forEach(cb => cb(data));
    }
    clear(path) {
        this.notifications[path] = [];
    }
    clearAll() {
        Object.keys(this.notifications).forEach(path => this.notifications[path] = []);
        this.notifications = {};
    }
}
exports.Notifier = Notifier;
