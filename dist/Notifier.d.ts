export type NotifierCallback<T> = (data: T) => void;
export interface NotifierSubscription {
    unsubscribe: () => void;
}
export declare class Notifier<T> {
    private notifications;
    subscribe(path: string, cb: NotifierCallback<T>): NotifierSubscription;
    notify(path: string, data: T): void;
    clear(path: string): void;
    clearAll(): void;
}
