"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var jquery_1 = __importDefault(require("jquery"));
var cursor_1 = __importDefault(require("editor/cursor"));
var glyph_1 = require("editor/glyph");
var linked_list_1 = require("data_structures/linked-list");
var rxjs_1 = require("rxjs");
var string_map_1 = __importDefault(require("string-map"));
var renderer_1 = require("editor/renderer");
var deleter_1 = require("editor/deleter");
/*
    TODO : Ensure click leads to correct iterator. It currently does not.

    TODO : Always have all the lines created, with the accompanying lines.
           Only show them from the first line to the farthest line that
           has text.
*/
var Editor = /** @class */ (function () {
    function Editor(editor_id) {
        this.renderer = new renderer_1.EditorRenderer();
        this.deleter = new deleter_1.EditorDeleter(this.renderer);
        this.cursor = new cursor_1.default();
        if (editor_id) {
            this.editor = jquery_1.default(editor_id);
        }
        else {
            this.editor = jquery_1.default('#editor');
        }
        this.glyphs = new linked_list_1.LinkedList();
        this.glyph_iter = this.glyphs.makeFrontIterator();
        if (this.valid()) {
            this.reset();
        }
    }
    Editor.prototype.reset = function () {
        this.editor.empty();
        this.editor.attr('spellcheck', 'false');
        this.glyphs.empty();
        this.glyph_iter = this.glyphs.makeFrontIterator();
        this.glyph_iter.insertAfter(new glyph_1.Glyph('\n', new glyph_1.GlyphStyle()));
        this.glyph_iter.next();
        this.glyph_iter.insertAfter(new glyph_1.Glyph('a', new glyph_1.GlyphStyle()));
        this.glyph_iter.next(); // We stay pointing at 'a', so cursor should be between a and b
        this.glyph_iter.insertAfter(new glyph_1.Glyph('b', new glyph_1.GlyphStyle()));
        this.rerender();
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
        var thisEditor = this;
        var keydownObs = rxjs_1.fromEvent(this.editor, 'keydown');
        var keydownSub = keydownObs.subscribe({
            next: function (event) {
                var key = event.key;
                if (key.length === 1) {
                    if (_this.cursor.isCollapsed()) {
                        _this.insertGlyph(key);
                        _this.renderCurrentGlyph();
                        _this.updateCursorToCurrent();
                        event.preventDefault();
                    }
                }
                else if (key === 'Backspace') {
                    if (_this.cursor.isCollapsed()) {
                        _this.deleteCurrentGlyphAndRerender(false);
                        event.preventDefault();
                    }
                }
                else if (key === 'Enter') {
                    _this.insertGlyph("\n");
                    // Renders glyph by rerendering current line and new line.
                    _this.rerenderCurrentGlyph();
                    event.preventDefault();
                }
                else if (key === 'Tab') {
                    _this.insertGlyph("\t");
                    event.preventDefault();
                }
            },
            error: function (err) { },
            complete: function () { }
        });
        var clickObs = rxjs_1.fromEvent(this.editor, 'click');
        var clickSub = clickObs.subscribe({
            next: function (event) {
                console.log(event);
                console.log(_this.cursor.selection);
                var target = jquery_1.default(event.target);
                if (target.hasClass(string_map_1.default.editorName())) {
                    var selectionNode = jquery_1.default(_this.cursor.selection.anchorNode);
                    if (selectionNode.hasClass(string_map_1.default.glyphName())) {
                        var targetNode_1 = selectionNode.get(0);
                        var iterator = _this.glyphs.find(function (glyph) {
                            var match = false;
                            glyph.getNode().caseOf({
                                just: function (node) {
                                    match = targetNode_1 === node;
                                },
                                nothing: function () { }
                            });
                            return match;
                        });
                        _this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), false);
                    }
                    else if (selectionNode.get(0).nodeType === 3) {
                        var targetNode_2 = selectionNode.parent(string_map_1.default.glyphSelector()).first().get(0);
                        var iterator = _this.glyphs.find(function (glyph) {
                            var match = false;
                            glyph.getNode().caseOf({
                                just: function (node) {
                                    match = targetNode_2 === node;
                                },
                                nothing: function () { }
                            });
                            return match;
                        });
                        _this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), false);
                    }
                    else {
                        // If we clicked outside the editor, for now, point the iterator
                        // at the first char of the first line, and then move cursor accordingly.
                        thisEditor.glyph_iter = thisEditor.glyphs.makeFrontIterator();
                        var count = 0;
                        if (thisEditor.glyph_iter.hasNext()) {
                            count += 1;
                            thisEditor.glyph_iter.next();
                            thisEditor.glyph_iter.get().caseOf({
                                just: function (glyph) {
                                    glyph.node.caseOf({
                                        just: function (node) {
                                            _this.cursor.moveCursorToNodeBoundary(node, true);
                                        },
                                        nothing: function () {
                                            console.log("Could not move cursor to glyph. Glyph had no rendered node");
                                        }
                                    });
                                },
                                nothing: function () {
                                    console.log("Could not move cursor to glyph. Glyph was empty somehow");
                                    // Do nothing. Hope for recovery.
                                }
                            });
                        }
                    }
                }
                else if (target.hasClass(string_map_1.default.lineName())) {
                    console.log('moving to line');
                }
                else if (target.hasClass(string_map_1.default.glyphName())) {
                    console.log('moving to glyph');
                    // Have to use selection to get correct cursor position
                    var toStart = _this.cursor.selection.anchorOffset === 0;
                    var targetNode_3 = jquery_1.default(_this.cursor.selection.anchorNode).parent(string_map_1.default.glyphSelector()).first().get(0);
                    var iterator = _this.glyphs.find(function (glyph) {
                        var match = false;
                        glyph.getNode().caseOf({
                            just: function (node) {
                                match = targetNode_3 === node;
                            },
                            nothing: function () { }
                        });
                        return match;
                    });
                    _this.glyph_iter = iterator;
                    _this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), toStart);
                }
                else if (target.get(0).nodeType === 3) {
                    // Was text node, so it should be in a span.
                    var node = target.parent(string_map_1.default.glyphSelector()).first();
                    if (node.length > 0) {
                        var targetNode_4 = node.get(0);
                        var iterator = _this.glyphs.find(function (glyph) {
                            var match = false;
                            glyph.getNode().caseOf({
                                just: function (node) {
                                    match = targetNode_4 === node;
                                },
                                nothing: function () { }
                            });
                            return match;
                        });
                        _this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), false);
                        console.log(_this.cursor.selection);
                    }
                }
                else {
                    console.log("NOT RECOGNIZED CLICK");
                    var firstLine = thisEditor.editor.children(".first-line").get(0);
                    _this.cursor.moveCursorToNodeBoundary(firstLine, false);
                }
                console.log(_this.glyph_iter.grab());
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
    Editor.prototype.rerender = function () {
        this.editor.empty();
        var iterator = this.glyphs.makeFrontIterator();
        while (iterator.hasNext()) {
            iterator.next();
            this.renderGlyph(iterator);
        }
        this.updateCursorToCurrent(); // Initially is between a and b!
    };
    Editor.prototype.insertGlyph = function (char) {
        this.glyph_iter.insertAfter(new glyph_1.Glyph(char, new glyph_1.GlyphStyle()));
        this.glyph_iter.next();
    };
    /**
     * @description -- deletes the current glyph and rerenders document
     * @param forward boolean that indicates direction in which to move after deletion.
     *                true indicates forward, false indicates backward.
     */
    Editor.prototype.deleteCurrentGlyphAndRerender = function (forward) {
        this.deleteGlyphAndRerender(this.glyph_iter, forward);
    };
    Editor.prototype.deleteGlyphAndRerender = function (iter, direction) {
        this.deleter.deleteAndRender(iter, this.editor.get(0), direction);
        this.updateCursorToCurrent();
    };
    Editor.prototype.rerenderCurrentGlyph = function () {
        this.rerenderGlyph(this.glyph_iter);
    };
    Editor.prototype.rerenderGlyph = function (iter) {
        this.renderer.rerender(iter, this.editor.get(0));
        this.updateCursorToCurrent();
    };
    /**
     * Renders glyph pointed at by the this.glyph_iter iterator.
     */
    Editor.prototype.renderCurrentGlyph = function () {
        this.renderGlyph(this.glyph_iter);
    };
    /**
     * @desciption - Renders glyph in DOM based on the surrounding nodes.
     * @param iter
     */
    Editor.prototype.renderGlyph = function (iter) {
        this.renderer.render(iter, this.editor.get(0));
    };
    /**
     * @description Updates cursor to be right after character of this.glyph_iter
     */
    Editor.prototype.updateCursorToCurrent = function () {
        this.updateCursor(this.glyph_iter);
    };
    /**
     * @description Updates cursor to be RIGHT AFTER character that iterator is pointing to.
     *              THIS IS FOR VISUAL FEEDBACK ONLY. Cursor placement is inaccurate and tricky. Don't use for data manip.
     * @param iter
     */
    Editor.prototype.updateCursor = function (iter) {
        var _this = this;
        // THIS IS FOR VISUAL FEEDBACK TO USER ONLY.
        // Using the cursor for direct insert is error prone, as it may be misplaced.
        iter.get().caseOf({
            just: function (glyph) {
                if (glyph.glyph === "\n") {
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
                console.log("updateCursor failed. Iterator did not get glyph");
                // This should only happen when glyph_iter is at front sentinel..
                if (iter.hasNext()) {
                    iter.next();
                    _this.updateCursor(iter);
                }
            }
        });
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
