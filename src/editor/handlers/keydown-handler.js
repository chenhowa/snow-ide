"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var string_map_1 = __importDefault(require("string-map"));
var editor_utils_1 = require("editor/editor_executors/editor-utils");
var KeydownHandler = /** @class */ (function () {
    function KeydownHandler(executor, cursor, editor, map) {
        this.start = tsmonad_1.Maybe.nothing();
        this.end = tsmonad_1.Maybe.nothing();
        this.executor = executor;
        this.cursor = cursor;
        this.editor = editor;
        this.keypress_map = map;
    }
    KeydownHandler.prototype.handle = function (event, source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        this.start = tsmonad_1.Maybe.just(source_start_iter.clone()); // By default, don't move the iterator.
        this.end = tsmonad_1.Maybe.just(source_end_iter.clone());
        var key = event.key;
        if (key === "Control") {
            event.preventDefault(); // Do not want to destroy the selection??
            return;
        }
        var new_iters;
        if (this._controlPressed()) {
            new_iters = this._handleKeyWithControl(event, key, start_iter, end_iter);
        }
        else {
            new_iters = this._handleKeyAlone(event, key, start_iter, end_iter);
        }
        this.start = tsmonad_1.Maybe.just(new_iters[0]);
        this.end = tsmonad_1.Maybe.just(new_iters[1]);
    };
    KeydownHandler.prototype._controlPressed = function () {
        return this.keypress_map.Control;
    };
    KeydownHandler.prototype._handleKeyWithControl = function (event, key, source_start_iter, source_end_iter) {
        // If control was pressed, do nothing? Does that let default happen?
        // TODO: Allow operations of copy, paste, etc.
        console.log("HANDLING KEY WITH CONTROL");
        return [source_start_iter.clone(), source_end_iter.clone()];
    };
    KeydownHandler.prototype._handleKeyAlone = function (event, key, source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        event.preventDefault();
        if (editor_utils_1.isChar(key)) {
            return this.executor.insertAndRender(key, start_iter, end_iter);
        }
        else if (key === 'Backspace') {
            return this.executor.deleteAndRender(start_iter, end_iter, false);
        }
        else if (key === 'Enter') {
            return this.executor.insertAndRerender(string_map_1.default.newline, source_start_iter, source_end_iter);
        }
        else if (editor_utils_1.isArrowKey(key)) {
            return this._handleArrowKey(key, start_iter, end_iter);
        }
        else {
            console.log("UNHANDLED KEY " + key);
        }
        return [start_iter.clone(), end_iter.clone()];
    };
    /**
     * @description: Use arrow key input to move iterator to correct location.
     * @param key
     * @param source_start_iter
     */
    KeydownHandler.prototype._handleArrowKey = function (key, source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (key === string_map_1.default.arrow.left) {
            return editor_utils_1.arrowLeft(start_iter, end_iter);
        }
        else if (key === string_map_1.default.arrow.right) {
            return editor_utils_1.arrowRight(start_iter, end_iter);
        }
        else if (key === string_map_1.default.arrow.up) {
            return editor_utils_1.arrowUp(start_iter, end_iter);
        }
        else if (key === string_map_1.default.arrow.down) {
            return editor_utils_1.arrowDown(start_iter, end_iter);
        }
        else {
            throw new Error("NOT AN ARROW KEY");
        }
    };
    KeydownHandler.prototype.getStartIterator = function () {
        return this.start;
    };
    KeydownHandler.prototype.getEndIterator = function () {
        return this.end;
    };
    return KeydownHandler;
}());
exports.default = KeydownHandler;
