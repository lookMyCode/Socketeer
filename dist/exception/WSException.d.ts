export declare class WSException extends Error {
    readonly error: any;
    readonly code: number;
    readonly close: boolean;
    constructor(error: any, // Wiadomość błedu lub obiekt
    code?: number, // Kod zamknięcia (opcjonalny, domyślnie Internal Error)
    close?: boolean);
}
