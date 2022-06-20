"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayCompare = exports.hash = exports.randomHash = void 0;
const crypto_1 = require("crypto");
function randomHash() {
    return [...Array(10)]
        .map(x => 0)
        .map(() => Math.random().toString(36).slice(2))
        .join('');
}
exports.randomHash = randomHash;
function hash(string) {
    return crypto_1.createHash('sha256').update(string).digest('hex');
}
exports.hash = hash;
function arrayCompare(array1, array2) {
    if (array1.length !== array2.length) {
        return false;
    }
    for (let i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
}
exports.arrayCompare = arrayCompare;
//# sourceMappingURL=index.js.map