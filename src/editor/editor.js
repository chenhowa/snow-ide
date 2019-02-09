"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var jquery_1 = __importDefault(require("jquery"));
var cursor_1 = __importDefault(require("editor/editor_executors/cursor"));
var glyph_1 = require("editor/glyph");
var linked_list_1 = require("data_structures/linked-list");
var rxjs_1 = require("rxjs");
var string_map_1 = __importDefault(require("string-map"));
var renderer_1 = require("editor/editor_executors/renderer");
var deleter_1 = require("editor/editor_executors/deleter");
var editor_executor_1 = require("editor/editor_executors/editor-executor");
var handlers_1 = require("editor/handlers/handlers");
var save_policies_1 = require("editor/undo_redo/policies/save-policies");
var keypress_map_singleton_1 = __importDefault(require("editor/singletons/keypress-map-singleton"));
var Editor = /** @class */ (function () {
    function Editor(editor_id) {
        this.cursor = new cursor_1.default();
        this.cursor = new cursor_1.default();
        if (editor_id) {
            this.editor = jquery_1.default(editor_id);
        }
        else {
            this.editor = jquery_1.default('#editor');
        }
        this.keypress_map = keypress_map_singleton_1.default.get();
        this.keypress_map.runOn(this.editor);
        this.save_command_policy = new save_policies_1.KeyDownTimeSavePolicy(20, this.editor);
        this.renderer = new renderer_1.EditorRenderer(this.editor.get(0));
        this.deleter = new deleter_1.EditorDeleter(this.renderer);
        this.executor = new editor_executor_1.EditorActionExecutor(this.renderer, this.deleter);
        this.glyphs = new linked_list_1.LinkedList();
        this.start_glyph_iter = this.glyphs.makeFrontIterator();
        this.end_glyph_iter = this.glyphs.makeFrontIterator();
        this.keydowner = new handlers_1.KeydownHandler(this.executor, this.cursor, this.editor.get(0), this.keypress_map);
        this.clicker = new handlers_1.ClickHandler(this.cursor, this.editor.get(0));
        if (this.valid()) {
            this.reset();
        }
    }
    Editor.prototype.reset = function () {
        this.editor.empty();
        this.editor.attr('spellcheck', 'false');
        this.glyphs.empty();
        this.end_glyph_iter = this.glyphs.makeFrontIterator();
        this.end_glyph_iter.insertAfter(new glyph_1.Glyph('\n', new glyph_1.GlyphStyle()));
        this.end_glyph_iter.next();
        this.end_glyph_iter.insertAfter(new glyph_1.Glyph('a', new glyph_1.GlyphStyle()));
        this.end_glyph_iter.next(); // We stay pointing at 'a', so cursor should be between a and b
        this.start_glyph_iter = this.end_glyph_iter.clone();
        this.end_glyph_iter.insertAfter(new glyph_1.Glyph('b', new glyph_1.GlyphStyle()));
        this.rerender();
    };
    Editor.prototype.rerender = function () {
        this.editor.empty();
        var iterator = this.glyphs.makeFrontIterator();
        while (iterator.hasNext()) {
            iterator.next();
            this.renderer.render(iterator, iterator);
        }
        this.updateCursorToCurrent(); // Initially is between a and b!
    };
    Editor.prototype.getDocument = function () {
        return this.glyphs.asArray().map(function (glyph) {
            return glyph.glyph;
        });
    };
    Editor.prototype.valid = function () {
        return this.editor.length !== 0;
    };
    Editor.prototype.run = function () {
        // We assume that a glyph that glyph_iter points to is the one that would be removed by BACKSPACE.
        // Hence the cursor will be IN FRONT of it.
        var _this = this;
        // Render initial state of document.
        this.rerender();
        var pasteObs = rxjs_1.fromEvent(this.editor, 'paste');
        var pasteSub = pasteObs.subscribe({
            next: function (event) {
                // get data and supposedly remove non-utf characters.
                var pasteText = event.originalEvent.clipboardData.getData('text');
                pasteText = pasteText.replace(/[^\x20-\xFF]/gi, '');
            },
            error: function (err) { },
            complete: function () { }
        });
        var keydownObs = rxjs_1.fromEvent(this.editor, 'keydown');
        var keydownSub = keydownObs.subscribe({
            next: function (event) {
                _this.keydowner.handle(event, _this.start_glyph_iter.clone(), _this.end_glyph_iter.clone());
                _this._updateIteratorsFromHandler(_this.keydowner);
                _this.updateCursorToCurrent();
            },
            error: function (err) { },
            complete: function () { }
        });
        var mouseDownObs = rxjs_1.fromEvent(this.editor, 'mousedown');
        var mouseDownSub = mouseDownObs.subscribe({
            next: function (event) {
                // Need to collapse selection on mouse down because otherwise it breaks a bunch of other shit
                // in chrome.
                if (_this.cursor.isSelection()) {
                    // If is selection, start mousedown by collapsing the selection.
                    _this.cursor.selection.removeAllRanges();
                }
            },
            error: function (err) { },
            complete: function () { }
        });
        var mouseUpObs = rxjs_1.fromEvent(this.editor, 'mouseup');
        var mouseUpSub = mouseUpObs.subscribe({
            next: function (event) {
                // TODO : Do something on mouseup, in case you mouse up outside of div, but had moused down in.
                //          -- looks like click doesn't register if you do this.
                // TODO : Do something on mousedown, in case you mouse down outside of editor but mouse up in.
                //          -- looks like click doesn't register if you do this.
                // RESULT TODO : Might need to sync INPUT (backspace, char, tab, enter, etc.) with the selection,
                //          Since invalid selections can still occur by the two above methods.
            },
            error: function (err) { },
            complete: function () { }
        });
        var clickObs = rxjs_1.fromEvent(this.editor, 'click');
        var clickSub = clickObs.subscribe({
            next: function (event) {
                _this.clicker.handle(event, _this.glyphs.makeFrontIterator(), _this.glyphs.makeBackIterator());
                _this._updateIteratorsFromHandler(_this.clicker);
                _this.updateCursorToCurrent();
            },
            error: function (err) { },
            complete: function () { }
        });
        var focusObs = rxjs_1.fromEvent(this.editor, 'focus');
        var focusSub = focusObs.subscribe({
            next: function (event) {
            },
            error: function (err) { },
            complete: function () { }
        });
    };
    Editor.prototype._updateIteratorsFromHandler = function (handler) {
        var _this = this;
        handler.getStartIterator().caseOf({
            just: function (iter) {
                _this.start_glyph_iter = iter;
            },
            nothing: function () {
                _this.start_glyph_iter = _this.glyphs.makeFrontIterator();
                if (_this.start_glyph_iter.hasNext()) {
                    _this.start_glyph_iter.next();
                }
                else {
                    throw new Error("Empty list. Need newline");
                }
            }
        });
        handler.getEndIterator().caseOf({
            just: function (iter) {
                _this.end_glyph_iter = iter;
            },
            nothing: function () {
                _this.end_glyph_iter = _this.start_glyph_iter.clone();
            }
        });
    };
    /**
     * @description Updates cursor to be right after character of this.glyph_iter.
     *              For visual feedback only.
     */
    Editor.prototype.updateCursorToCurrent = function () {
        this.updateCursor(this.start_glyph_iter, this.end_glyph_iter);
    };
    /**
     * @description Updates cursor to be RIGHT AFTER character that iterator is pointing to.
     *              THIS IS FOR VISUAL FEEDBACK ONLY. Cursor placement is inaccurate and tricky. Don't use for data manip.
     * @param source_start
     * @param source_end
     */
    Editor.prototype.updateCursor = function (source_start, source_end) {
        var _this = this;
        // THIS IS FOR VISUAL FEEDBACK TO USER ONLY.
        // Using the cursor for direct insert is error prone, as it may be misplaced.
        var start = source_start.clone();
        var end = source_end.clone();
        if (start.equals(end)) {
            // If both start and end point to the same glyph, we collapse the cursor to one.
            end.get().caseOf({
                just: function (glyph) {
                    if (glyph.glyph === string_map_1.default.newline) {
                        glyph.getNode().caseOf({
                            just: function (newlineNode) {
                                var glyphNode = jquery_1.default(newlineNode).children(string_map_1.default.glyphSelector()).first();
                                if (glyphNode.length > 0) {
                                    _this.cursor.moveCursorToNodeBoundary(glyphNode.get(0), false);
                                }
                                else {
                                    throw new Error("DID NOT FIND A HIDDEN SPAN IN LINE DIV");
                                }
                            },
                            nothing: function () { }
                        });
                    }
                    else {
                        // Otherwise we just move cursor to node, if it has been rendered.
                        glyph.getNode().caseOf({
                            just: function (spanNode) {
                                _this.cursor.moveCursorToNodeBoundary(spanNode, false);
                            },
                            nothing: function () { }
                        });
                    }
                },
                nothing: function () {
                    // This should only happen when end_glyph_iter is at front sentinel..
                    // we attempt to repair state.
                    var temp = _this.glyphs.makeFrontIterator();
                    if (temp.hasNext()) {
                        temp.next();
                        _this.start_glyph_iter = temp.clone();
                        _this.end_glyph_iter = temp.clone();
                        _this.updateCursor(_this.start_glyph_iter, _this.end_glyph_iter);
                    }
                    else {
                        throw new Error("Found empty glyph. Could not move cursor to it. Could not repair");
                    }
                }
            });
        }
        else {
            // If start and end are not equal, we ASSUME that start is before end,
            // and we update the selection to reflect this. We also
            // assume, for now, that start and end are guaranteed to be pointing
            // to valid nodes (not sentinel and not empty);
            var start_glyph = start.grab();
            var end_glyph = end.grab();
            this.cursor.selection.empty();
            var range_1 = new Range();
            start_glyph.getNode().caseOf({
                just: function (start_node) {
                    if (jquery_1.default(start_node).hasClass(string_map_1.default.lineName())) {
                        var firstGlyph = jquery_1.default(start_node).children(string_map_1.default.glyphSelector()).first();
                        if (firstGlyph.length > 0) {
                            start_node = firstGlyph.get(0);
                        }
                        else {
                            throw new Error("line's first span does not exist");
                        }
                    }
                    range_1.setStart(start_node, start_node.childNodes.length);
                },
                nothing: function () {
                    // For now, do nothing.
                }
            });
            end_glyph.getNode().caseOf({
                just: function (end_node) {
                    if (jquery_1.default(end_node).hasClass(string_map_1.default.lineName())) {
                        var firstGlyph = jquery_1.default(end_node).children(string_map_1.default.glyphSelector()).first();
                        if (firstGlyph.length > 0) {
                            end_node = firstGlyph.get(0);
                        }
                        else {
                            throw new Error("line's first span does not exist");
                        }
                    }
                    range_1.setEnd(end_node, end_node.childNodes.length);
                },
                nothing: function () {
                }
            });
            this.cursor.selection.addRange(range_1);
        }
    };
    Editor.new = function (editor_id) {
        var editor = new Editor(editor_id);
        if (editor.valid()) {
            return tsmonad_1.Maybe.just(editor);
        }
        else {
            return tsmonad_1.Maybe.nothing();
        }
    };
    return Editor;
}());
exports.default = Editor;
