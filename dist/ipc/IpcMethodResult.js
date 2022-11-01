"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcMethodResult = void 0;
class IpcMethodResult {
    constructor(allResults) {
        this.allResults = allResults;
    }
    get results() {
        if (this.isValid) {
            return this.allResults.map(i => i.result);
        }
        throw new Error(this.firstError || 'Unknown error');
    }
    get result() {
        if (this.isValid) {
            return this.firstResult;
        }
        throw new Error(this.firstError || 'Unknown error');
    }
    get isValid() {
        return !!this.allResults.find(i => !i?.error);
    }
    get firstResult() {
        return this.allResults.find(i => !i?.error)?.result;
    }
    get allValidResults() {
        return this.allResults.filter(i => !i?.error).map(i => i.result);
    }
    get firstError() {
        return this.allResults.find(i => i?.error)?.error;
    }
    get allErrors() {
        return this.allResults.filter(i => i?.error).map(i => i.error);
    }
}
exports.IpcMethodResult = IpcMethodResult;
//# sourceMappingURL=IpcMethodResult.js.map