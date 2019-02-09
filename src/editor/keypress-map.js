"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var EditorKeyPressMap = /** @class */ (function () {
    function EditorKeyPressMap() {
        this.Control = false;
    }
    EditorKeyPressMap.prototype.runOn = function (node) {
        var _this = this;
        var keydownObs = rxjs_1.fromEvent(node, 'keydown');
        var keydownSub = keydownObs.subscribe({
            next: function (event) {
                var key = event.key;
                if (key === 'Control') {
                    _this.Control = true;
                }
            }
        });
        var keyupObs = rxjs_1.fromEvent(node, 'keyup');
        var keyupSub = keyupObs.subscribe({
            next: function (event) {
                var key = event.key;
                if (key === 'Control') {
                    _this.Control = false;
                }
            }
        });
    };
    return EditorKeyPressMap;
}());
exports.EditorKeyPressMap = EditorKeyPressMap;
