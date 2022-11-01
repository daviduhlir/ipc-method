/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as cluster from 'cluster';
import { EventEmitter } from 'events';
import { IpcMethodResult } from './IpcMethodResult';
export declare type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never;
export declare type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export declare type AsObject<T> = {
    [K in keyof T]: (...a: ArgumentTypes<T[K]>) => Promise<IpcMethodResult<ThenArg<(ReturnType<T[K] extends (...args: any) => Promise<any> ? (T[K]) : never>)>>>;
};
export declare type AsObjectFirstResult<T> = {
    [K in keyof T]: (...a: ArgumentTypes<T[K]>) => Promise<ThenArg<(ReturnType<T[K] extends (...args: any) => Promise<any> ? (T[K]) : never>)>>;
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
export interface IpcCallWaiter {
    reject: (error: any) => void;
    resolve: (message: any) => void;
    workerId: string | number;
    messageId: string;
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
    protected waitedResponses: IpcCallWaiter[];
    constructor(topics: string[], receivers?: {
        [name: string]: (...params: any[]) => Promise<any>;
    });
    callWithResult<T>(action: string, ...params: any[]): Promise<IpcMethodResult<T>>;
    call(action: string, ...params: any[]): IpcInternalMessage;
    as<T>(targetProcesses?: (NodeJS.Process | cluster.Worker)[]): AsObjectFirstResult<T>;
    asProxy<T>(targetProcesses?: (NodeJS.Process | cluster.Worker)[]): AsObject<T>;
    rejectAllCalls(): void;
    protected asProxyHandler<T>(targetProcesses?: (NodeJS.Process | cluster.Worker)[], useFirstResult?: boolean): any;
    protected sendCall(action: string, targetProcesses: (NodeJS.Process | cluster.Worker)[], messageId: string, ...params: any[]): IpcInternalMessage;
    protected sendCallWithResult<T>(action: string, targetProcesses: (NodeJS.Process | cluster.Worker)[], ...params: any[]): Promise<IpcMethodResult<T>>;
    protected get processes(): (NodeJS.Process | cluster.Worker)[];
    protected handleWorkerExit: (worker: cluster.Worker) => void;
    protected handleClusterIncomingMessage: (worker: cluster.Worker, message: any) => Promise<void>;
    protected handleIncomingMessage: (message: IpcInternalMessage, workerId?: string | number) => Promise<void>;
}
