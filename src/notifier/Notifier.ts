import { NotifierCallback } from "./NotifierCallback";
import { NotifierSubscription } from "./NotifierSubscription";


export class Notifier<T> {
  private notifications: { [path: string]: NotifierCallback<T>[] } = {};

  subscribe(path: string, cb: NotifierCallback<T>): NotifierSubscription {
    if (!this.notifications[path]) this.notifications[path] = [];
    this.notifications[path].push(cb);

    return {
      unsubscribe: () => {
        this.notifications[path] = this.notifications[path].filter(c => c !== cb);
      }
    }
  }

  notify(path: string, data: T) {
    if (!this.notifications[path]) return;
    this.notifications[path].forEach(cb => cb(data));
  }

  clear(path: string) {
    this.notifications[path] = [];
  }

  clearAll() {
    Object.keys(this.notifications).forEach(path => this.clear(path));
    this.notifications = {};
  }
}
