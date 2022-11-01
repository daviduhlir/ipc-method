export declare class IpcMethodResult<T> {
    readonly allResults: {
        result?: T;
        error?: any;
    }[];
    constructor(allResults: {
        result?: T;
        error?: any;
    }[]);
    get results(): T[];
    get result(): T;
    get isValid(): boolean;
    get firstResult(): T | undefined;
    get allValidResults(): T[];
    get firstError(): string;
    get allErrors(): string[];
}
