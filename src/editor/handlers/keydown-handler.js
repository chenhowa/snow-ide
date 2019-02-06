"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var glyph_1 = require("editor/glyph");
var string_map_1 = __importDefault(require("string-map"));
var editor_utils_1 = require("editor/editor-utils");
var KeydownHandler = /** @class */ (function () {
    function KeydownHandler(renderer, deleter, cursor, editor, map) {
        this.renderer = renderer;
        this.deleter = deleter;
        this.iterator = tsmonad_1.Maybe.nothing();
        this.cursor = cursor;
        this.editor = editor;
        this.keypress_map = map;
    }
    KeydownHandler.prototype.handle = function (event, source_iter) {
        var iter = source_iter.clone();
        this.iterator = tsmonad_1.Maybe.just(source_iter.clone()); // By default, don't move the iterator.        
        var key = event.key;
        if (key === "Control") {
            this.keypress_map.Control = true;
            return;
        }
        if (this._controlPressed()) {
            this._handleKeyWithControl(event, key, iter);
        }
        else {
            this._handleKeyAlone(event, key, iter);
        }
    };
    KeydownHandler.prototype._controlPressed = function () {
        return this.keypress_map.Control;
    };
    KeydownHandler.prototype._handleKeyWithControl = function (event, key, iter) {
        // If control was pressed, do nothing? Does that let default happen?
        // TODO: Allow operations of copy, paste, etc.
        console.log("HANDLING WITH CONTROL");
    };
    KeydownHandler.prototype._handleKeyAlone = function (event, key, iter) {
        if (this._isChar(key)) {
            if (this.cursor.isCollapsed()) {
                this._insertGlyph(key, iter);
                this._renderGlyph(iter);
                this.iterator = tsmonad_1.Maybe.just(iter);
                event.preventDefault();
            }
        }
        else if (key === 'Backspace') {
            if (this.cursor.isCollapsed()) {
                var new_iter = this._deleteGlyphAndRerender(iter, false);
                this.iterator = tsmonad_1.Maybe.just(new_iter);
                event.preventDefault();
            }
        }
        else if (key === 'Enter') {
            if (this.cursor.isCollapsed()) {
                this._insertGlyph(string_map_1.default.newline, iter);
                // Renders glyph by rerendering current line and new line.
                this._rerenderGlyph(iter);
                this.iterator = tsmonad_1.Maybe.just(iter);
                event.preventDefault();
            }
        }
        else if (key === 'Tab') {
            // TODO. Insert 4 \t glyphs to represent each space in a tab.
            // This allows you to render each as a <span class='tab'> </span>
            this._insertGlyph(string_map_1.default.tab, iter);
            event.preventDefault();
        }
        else if (this._isArrowKey(key)) {
            // TODO. Move iterator to correct destination and then rerender the cursor.
            this._handleArrowKey(key, iter);
            event.preventDefault();
        }
    };
    KeydownHandler.prototype._isChar = function (key) {
        return key.length === 1;
    };
    /**
     * @description - inserts the char as a glyph, and updates iterator to point at the new glyph.
     * @param char
     * @param iter
     */
    KeydownHandler.prototype._insertGlyph = function (char, iter) {
        iter.insertAfter(new glyph_1.Glyph(char, new glyph_1.GlyphStyle()));
        iter.next();
    };
    /**
     * @desciption - Renders glyph in DOM based on the surrounding nodes.
     * @param iter
     */
    KeydownHandler.prototype._renderGlyph = function (iter) {
        this.renderer.render(iter, this.editor);
    };
    /**
     * @description - deletes the pointed at glyph and rerenders document
     * @param iter    NOT MODIFIED. Will modify iterator to move it to correct position.
     * @param direction true if delete and move forward, else go backward.
     */
    KeydownHandler.prototype._deleteGlyphAndRerender = function (iter, direction) {
        return this.deleter.deleteAndRender(iter, this.editor, direction);
    };
    /**
     * @description -- rerenders a glyph.
     * @param iter
     */
    KeydownHandler.prototype._rerenderGlyph = function (iter) {
        this.renderer.rerender(iter, this.editor);
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
     * @param iter
     */
    KeydownHandler.prototype._handleArrowKey = function (key, iter) {
        var _this = this;
        if (key === string_map_1.default.arrow.left) {
            if (iter.hasPrev()) {
                iter.prev();
                this.iterator = tsmonad_1.Maybe.just(iter);
            }
        }
        else if (key === string_map_1.default.arrow.right) {
            if (iter.hasNext()) {
                iter.next();
                this.iterator = tsmonad_1.Maybe.just(iter);
            }
        }
        else if (key === string_map_1.default.arrow.up) {
            var final_iter_1 = iter.clone();
            editor_utils_1.getDistanceFromLineStart(iter).caseOf({
                just: function (distance) {
                    var move = false;
                    if (distance === 0) {
                        editor_utils_1.findPreviousNewline(iter).caseOf({
                            just: function (new_iter) {
                                final_iter_1 = new_iter;
                            },
                            nothing: function () { }
                        });
                    }
                    else {
                        editor_utils_1.findPreviousNewline(iter).caseOf({
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
            this.iterator = tsmonad_1.Maybe.just(final_iter_1);
        }
        else if (key === string_map_1.default.arrow.down) {
            // find previous newline to determine distance from line start
            editor_utils_1.getDistanceFromLineStart(iter).caseOf({
                just: function (distance) {
                    // now find start of next line (if any), and then
                    // walk the distance from the start.
                    var foundNext = false;
                    while (iter.hasNext() && !foundNext) {
                        iter.next();
                        iter.get().caseOf({
                            just: function (glyph) {
                                if (glyph.glyph === string_map_1.default.newline) {
                                    foundNext = true;
                                }
                            },
                            nothing: function () { }
                        });
                    }
                    if (foundNext) {
                        var _loop_1 = function () {
                            iter.next();
                            var tooFar = false;
                            iter.get().caseOf({
                                just: function (glyph) {
                                    if (glyph.glyph === string_map_1.default.newline) {
                                        tooFar = true;
                                    }
                                },
                                nothing: function () { }
                            });
                            if (tooFar) {
                                iter.prev(); // back off from the newline.
                                return "break";
                            }
                        };
                        // We found the next new line, or there was no next newline.
                        for (var i = 0; i < distance; i++) {
                            var state_1 = _loop_1();
                            if (state_1 === "break")
                                break;
                        }
                        _this.iterator = tsmonad_1.Maybe.just(iter);
                    }
                    else {
                        // If no next newline, do nothing.
                    }
                },
                nothing: function () {
                    throw new Error("doc does not start with newline");
                }
            });
        }
    };
    KeydownHandler.prototype.getNewIterators = function () {
        return this.iterator;
    };
    KeydownHandler.prototype.getEndIterator = function () {
        return this.iterator;
    };
    return KeydownHandler;
}());
exports.default = KeydownHandler;
