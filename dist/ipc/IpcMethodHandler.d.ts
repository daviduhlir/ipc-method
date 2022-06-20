/// <reference types="node" />
import * as cluster from 'cluster';
import { IpcMethodResult } from './IpcMethodResult';
export interface IpcInternalMessage {
    TOPICS: string[];
    ACTION: string;
    PARAMS?: any[];
    MESSAGE_ID?: string;
    WORKER?: number | string;
    RESULT?: string;
    value?: any;
    error?: any;
}
export declare const MESSAGE_RESULT: {
    SUCCESS: string;
    ERROR: string;
};
export declare class IpcMethodHandler {
    readonly topics: string[];
    readonly receivers: {
        [name: string]: (...params: any[]) => Promise<any>;
    };
    constructor(topics: string[], receivers?: {
        [name: string]: (...params: any[]) => Promise<any>;
    });
    callWithResult<T>(action: string, ...params: any[]): Promise<IpcMethodResult<T>>;
    call(action: string, ...params: any[]): IpcInternalMessage;
    protected get processes(): (NodeJS.Process | cluster.Worker)[];
    protected reattachMessageHandlers(): void;
    protected handleIncomingMessage: (message: IpcInternalMessage) => Promise<void>;
}
