export declare class IpcMethodResult<T> {
    readonly results: {
        result?: T;
        error?: any;
    }[];
    constructor(results: {
        result?: T;
        error?: any;
    }[]);
    get result(): T;
    get isValid(): boolean;
    get firstResult(): T | undefined;
    get allResults(): T[];
    get firstError(): string;
    get allErrors(): string[];
}
