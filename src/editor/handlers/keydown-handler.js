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
            this.keypress_map.Control = true;
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
        console.log("HANDLING WITH CONTROL");
        return [source_start_iter.clone(), source_end_iter.clone()];
    };
    KeydownHandler.prototype._handleKeyAlone = function (event, key, source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        event.preventDefault();
        if (this._isChar(key)) {
            return this.executor.insertAndRender(key, start_iter, end_iter);
        }
        else if (key === 'Backspace') {
            return this.executor.deleteAndRender(start_iter, end_iter, false);
        }
        else if (key === 'Enter') {
            return this.executor.insertAndRerender(string_map_1.default.newline, source_start_iter, source_end_iter);
        }
        else if (this._isArrowKey(key)) {
            // TODO. Move iterator to correct destination and then rerender the cursor.
            return this._handleArrowKey(key, start_iter, end_iter);
        }
        else {
            console.log("UNHANDLED KEY " + key);
        }
        return [start_iter.clone(), end_iter.clone()];
    };
    KeydownHandler.prototype._isChar = function (key) {
        return key.length === 1;
    };
    KeydownHandler.prototype._isArrowKey = function (key) {
        var keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
        for (var i = 0; i < keys.length; i++) {
            if (key === keys[i]) {
                return true;
            }
        }
        return false;
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
            return this._arrowLeft(start_iter, end_iter);
        }
        else if (key === string_map_1.default.arrow.right) {
            return this._arrowRight(start_iter, end_iter);
        }
        else if (key === string_map_1.default.arrow.up) {
            return this._arrowUp(start_iter, end_iter);
        }
        else if (key === string_map_1.default.arrow.down) {
            return this._arrowDown(start_iter, end_iter);
        }
        else {
            throw new Error("NOT AN ARROW KEY");
        }
    };
    KeydownHandler.prototype._arrowLeft = function (source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (start_iter.equals(end_iter)) {
            // Back both up by one if possible.
            if (start_iter.hasPrev()) {
                start_iter.prev();
                end_iter = start_iter.clone();
            }
        }
        else {
            // If selection, collapse end into start (left).
            end_iter = start_iter.clone();
        }
        return [start_iter.clone(), end_iter.clone()];
    };
    KeydownHandler.prototype._arrowRight = function (source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (start_iter.equals(end_iter)) {
            if (start_iter.hasNext()) {
                start_iter.next();
                end_iter = start_iter.clone();
            }
        }
        else {
            // If selection, collapse start into end (right)
            start_iter = end_iter.clone();
        }
        return [start_iter.clone(), end_iter.clone()];
    };
    KeydownHandler.prototype._arrowUp = function (source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (start_iter.equals(end_iter)) {
            var final_iter_1 = start_iter.clone();
            editor_utils_1.getDistanceFromLineStart(start_iter).caseOf({
                just: function (distance) {
                    var move = false;
                    if (distance === 0) {
                        editor_utils_1.findPreviousNewline(start_iter).caseOf({
                            just: function (new_iter) {
                                final_iter_1 = new_iter;
                            },
                            nothing: function () { }
                        });
                    }
                    else {
                        editor_utils_1.findPreviousNewline(start_iter).caseOf({
                            just: function (new_iter) {
                                editor_utils_1.findPreviousNewline(new_iter).caseOf({
                                    just: function (new_iter) {
                                        final_iter_1 = new_iter;
                                        move = true;
                                    },
                                    nothing: function () {
                                    }
                                });
                            },
                            nothing: function () { }
                        });
                        if (move) {
                            for (var i = 0; i < distance; i++) {
                                final_iter_1.next();
                                var done = final_iter_1.get().caseOf({
                                    just: function (glyph) {
                                        if (glyph.glyph === string_map_1.default.newline) {
                                            // If found newline, back up one.
                                            final_iter_1.prev();
                                            return true;
                                        }
                                    },
                                    nothing: function () {
                                        return false;
                                    }
                                });
                                if (done) {
                                    break;
                                }
                            }
                        }
                    }
                },
                nothing: function () {
                    throw new Error("Document did not start with a line!");
                }
            });
            return [final_iter_1.clone(), final_iter_1.clone()];
        }
        else {
            // If selection, up will just go left.
            return this._arrowLeft(start_iter, end_iter);
        }
    };
    KeydownHandler.prototype._arrowDown = function (source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (start_iter.equals(end_iter)) {
            // find previous newline to determine distance from line start
            console.log("going down on collapsed");
            var final_iter_2 = start_iter.clone();
            editor_utils_1.getDistanceFromLineStart(start_iter).caseOf({
                just: function (distance) {
                    var line_end_iter = editor_utils_1.findLineEnd(start_iter);
                    var foundNext = line_end_iter.hasNext();
                    if (foundNext) {
                        // We found the next new line, or there was no next newline.
                        final_iter_2 = line_end_iter.clone();
                        final_iter_2.next();
                        var _loop_1 = function () {
                            final_iter_2.next();
                            var tooFar = false;
                            final_iter_2.get().caseOf({
                                just: function (glyph) {
                                    if (glyph.glyph === string_map_1.default.newline) {
                                        tooFar = true;
                                    }
                                },
                                nothing: function () { }
                            });
                            if (tooFar) {
                                final_iter_2.prev(); // back off from the newline.
                                return "break";
                            }
                        };
                        for (var i = 0; i < distance; i++) {
                            var state_1 = _loop_1();
                            if (state_1 === "break")
                                break;
                        }
                    }
                    else {
                        // If no next line, we don't move.
                    }
                },
                nothing: function () {
                    throw new Error("doc does not start with newline");
                }
            });
            return [final_iter_2.clone(), final_iter_2.clone()];
        }
        else {
            // If selection, will just go right.
            console.log("DOWN BUT GOING RIGHT");
            return this._arrowRight(start_iter, end_iter);
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
