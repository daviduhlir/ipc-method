/// <reference types="node" />
import * as cluster from 'cluster';
import EventEmitter = require('events');
import { IpcMethodResult } from './IpcMethodResult';
export declare type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never;
export declare type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export declare type AsObject<T> = {
    [K in keyof T]: (...a: ArgumentTypes<T[K]>) => Promise<IpcMethodResult<ThenArg<(ReturnType<T[K] extends (...args: any) => Promise<any> ? (T[K]) : never>)>>>;
};
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
export declare class IpcMethodHandler extends EventEmitter {
    readonly topics: string[];
    readonly receivers: {
        [name: string]: (...params: any[]) => Promise<any>;
    };
    constructor(topics: string[], receivers?: {
        [name: string]: (...params: any[]) => Promise<any>;
    });
    callWithResult<T>(action: string, ...params: any[]): Promise<IpcMethodResult<T>>;
    call(action: string, ...params: any[]): IpcInternalMessage;
    as<T>(): AsObject<T>;
    protected get processes(): (NodeJS.Process | cluster.Worker)[];
    protected reattachMessageHandlers(): void;
    protected handleIncomingMessage: (message: IpcInternalMessage) => Promise<void>;
}
