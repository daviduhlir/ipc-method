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
        this.handleIncomingMessage = async (message) => {
            if (typeof message === 'object' &&
                message.ACTION &&
                !message.RESULT &&
                utils_1.arrayCompare(message.TOPICS, this.topics)) {
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
                    this.processes.forEach(p => p.send(resultMessage));
                }
            }
        };
        if (cluster.isMaster) {
            this.reattachMessageHandlers();
            cluster?.on('fork', () => this.reattachMessageHandlers());
            cluster?.on('exit', () => this.reattachMessageHandlers());
        }
        else {
            process.on('message', this.handleIncomingMessage);
        }
    }
    async callWithResult(action, ...params) {
        let outgoingMessage = null;
        const results = Promise.all(this.processes.map(p => new Promise((resolve, reject) => {
            const messageHandler = (message) => {
                if (typeof message === 'object' &&
                    message.MESSAGE_ID === outgoingMessage.MESSAGE_ID &&
                    message.RESULT &&
                    message.ACTION === action &&
                    utils_1.arrayCompare(message.TOPICS, this.topics)) {
                    p.removeListener('message', messageHandler);
                    p.removeListener('exit', rejectHandler);
                    if (message.RESULT === exports.MESSAGE_RESULT.SUCCESS) {
                        resolve({ result: message.value });
                    }
                    else {
                        resolve({ error: message.error });
                    }
                }
            };
            const rejectHandler = () => {
                p.removeListener('message', messageHandler);
                p.removeListener('exit', rejectHandler);
                resolve({ error: new Error(`Process died during call.`) });
            };
            p.addListener('message', messageHandler);
            p.addListener('exit', rejectHandler);
        })));
        outgoingMessage = this.call(action, ...params);
        return new IpcMethodResult_1.IpcMethodResult(await results);
    }
    call(action, ...params) {
        const messageId = utils_1.randomHash();
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
    as() {
        return new Proxy(this, {
            get: (target, propKey, receiver) => async (...args) => {
                const result = await this.callWithResult(propKey.toString(), args);
                if (result.isValid) {
                    return result.firstResult;
                }
                throw new Error(result.firstError || 'Unknown error');
            },
        });
    }
    get processes() {
        if (cluster.isWorker) {
            return [process];
        }
        else {
            return Object.keys(cluster.workers).reduce((acc, workerId) => [...acc, cluster.workers?.[workerId]], []);
        }
    }
    reattachMessageHandlers() {
        Object.keys(cluster.workers).forEach(workerId => {
            cluster.workers?.[workerId]?.removeListener('message', this.handleIncomingMessage);
            cluster.workers?.[workerId]?.addListener('message', this.handleIncomingMessage);
        });
    }
}
exports.IpcMethodHandler = IpcMethodHandler;
//# sourceMappingURL=IpcMethodHandler.js.map