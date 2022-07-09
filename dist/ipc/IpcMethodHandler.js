"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcMethodHandler = exports.MESSAGE_RESULT = void 0;
const cluster = require("cluster");
const utils_1 = require("../utils");
const IpcMethodResult_1 = require("./IpcMethodResult");
exports.MESSAGE_RESULT = {
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
};
class IpcMethodHandler {
    constructor(topics, receivers = {}) {
        this.topics = topics;
        this.receivers = receivers;
        this.waitedResponses = [];
        this.handleWorkerExit = (worker) => {
        };
        this.handleClusterIncomingMessage = async (worker, message) => {
            if (worker) {
                return this.handleIncomingMessage(message, worker.id);
            }
        };
        this.handleIncomingMessage = async (message, workerId = 'master') => {
            if (typeof message === 'object' && message.ACTION && utils_1.arrayCompare(message.TOPICS, this.topics) && message.WORKER) {
                if (!message.RESULT) {
                    let value = null;
                    let error = null;
                    try {
                        if (typeof this.receivers[message.ACTION] !== 'function') {
                            throw new Error('METHOD_NOT_FOUND');
                        }
                        value = await this.receivers[message.ACTION](...(message.PARAMS || []));
                    }
                    catch (e) {
                        error = e.toString();
                    }
                    if (message.MESSAGE_ID) {
                        const resultMessage = {
                            TOPICS: message.TOPICS,
                            ACTION: message.ACTION,
                            MESSAGE_ID: message.MESSAGE_ID,
                            RESULT: error ? exports.MESSAGE_RESULT.ERROR : exports.MESSAGE_RESULT.SUCCESS,
                            error,
                            value,
                        };
                        if (workerId === 'master') {
                            process.send(resultMessage);
                        }
                        else {
                            cluster.workers[workerId].send(resultMessage);
                        }
                    }
                }
            }
            else if (message.MESSAGE_ID) {
                const foundItem = this.waitedResponses.find(item => item.messageId === message.MESSAGE_ID && item.workerId === workerId);
                if (foundItem) {
                    foundItem.resolve(message);
                }
            }
        };
        if (cluster.isMaster) {
            cluster?.on('exit', this.handleWorkerExit);
            cluster?.on('message', this.handleClusterIncomingMessage);
        }
        else {
            process.addListener('message', this.handleIncomingMessage);
        }
    }
    async callWithResult(action, ...params) {
        const messageId = utils_1.randomHash();
        const results = Promise.all(this.processes.map(p => new Promise((resolve, reject) => {
            const workerId = (p instanceof cluster.Worker) ? p.id : 'master';
            this.waitedResponses.push({
                resolve: (message) => {
                    this.waitedResponses = this.waitedResponses.filter(i => i.messageId !== messageId);
                    if (message.RESULT === exports.MESSAGE_RESULT.SUCCESS) {
                        resolve({ result: message.value });
                    }
                    else {
                        resolve({ error: message.error });
                    }
                },
                reject: () => {
                    this.waitedResponses = this.waitedResponses.filter(i => i.messageId !== messageId);
                    resolve({ error: new Error(`Call was rejected, process probably died during call, or rejection was called.`) });
                },
                messageId,
                workerId,
            });
        })));
        this.sendCall(action, messageId, ...params);
        return new IpcMethodResult_1.IpcMethodResult(await results);
    }
    call(action, ...params) {
        const messageId = utils_1.randomHash();
        return this.sendCall(action, messageId, ...params);
    }
    as() {
        return new Proxy(this, {
            get: (target, propKey, receiver) => async (...args) => {
                const result = await this.callWithResult(propKey.toString(), ...args);
                if (result.isValid) {
                    return result.firstResult;
                }
                throw new Error(result.firstError || 'Unknown error');
            },
        });
    }
    rejectAllCalls() {
        this.waitedResponses.forEach(item => item.reject('MANUAL_REJECTED_ALL'));
    }
    sendCall(action, messageId, ...params) {
        const message = {
            TOPICS: this.topics,
            ACTION: action,
            PARAMS: params,
            MESSAGE_ID: messageId,
            WORKER: cluster.isMaster ? 'master' : cluster.worker?.id,
        };
        this.processes.forEach(p => p.send(message));
        return message;
    }
    get processes() {
        if (cluster.isWorker) {
            return [process];
        }
        else {
            return Object.keys(cluster.workers).reduce((acc, workerId) => [...acc, cluster.workers?.[workerId]], []);
        }
    }
}
exports.IpcMethodHandler = IpcMethodHandler;
//# sourceMappingURL=IpcMethodHandler.js.map