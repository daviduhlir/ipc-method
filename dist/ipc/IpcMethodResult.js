"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcMethodResult = void 0;
class IpcMethodResult {
    constructor(results) {
        this.results = results;
    }
    get result() {
        if (this.isValid) {
            return this.firstResult;
        }
        throw new Error(this.firstError);
    }
    get isValid() {
        return !!this.results.find(i => !i?.error);
    }
    get firstResult() {
        return this.results.find(i => !i?.error)?.result;
    }
    get allResults() {
        return this.results.filter(i => !i?.error).map(i => i.result);
    }
    get firstError() {
        return this.results.find(i => i?.error)?.error;
    }
    get allErrors() {
        return this.results.filter(i => i?.error).map(i => i.error);
    }
}
exports.IpcMethodResult = IpcMethodResult;
//# sourceMappingURL=IpcMethodResult.js.map