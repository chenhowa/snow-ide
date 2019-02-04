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
/*
    TODO : Handle Enter to insert new line where CURSOR is, not at the end of the document.
    TODO : Handle Enter to scroll only if cursor is at LAST LINE
    TODO : Handle how to track last line.

    TODO : Always have all the lines created, with the accompanying lines.
           Only show them from the first line to the farthest line that
           has text.
*/
var Editor = /** @class */ (function () {
    function Editor(editor_id) {
        this.maxLines = 0;
        this.currentLine = 0;
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
                        _this.cursor.maybeMoveCursorToNodeBoundary(_this.glyph_iter.get(), false);
                        event.preventDefault();
                    }
                }
                else if (key === 'Backspace') {
                    if (_this.cursor.isCollapsed()) {
                        _this.deleteCurrentGlyph(false);
                        _this.glyph_iter.get().caseOf({
                            just: function (glyph) {
                                glyph.getNode().caseOf({
                                    just: function (node) {
                                        if (glyph.glyph === "\n") {
                                            // We need to move to first glyph child of newline
                                            var firstSpan = jquery_1.default(node).children(string_map_1.default.glyphSelector()).first();
                                            _this.cursor.moveCursorToNodeBoundary(firstSpan.get(0), false);
                                        }
                                        else {
                                            _this.cursor.moveCursorToNodeBoundary(node, false);
                                        }
                                    },
                                    nothing: function () {
                                        // do nothing. Cannot move.
                                    }
                                });
                            },
                            nothing: function () {
                            }
                        });
                        event.preventDefault();
                    }
                }
                else if (key === 'Enter') {
                    _this.insertGlyph("\n");
                    // Renders glyph by rerendering the next two lines.
                    _this.rerenderCurrentGlyph(); // renders glyph as div and span, and inserts.
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
        this.cursor.moveCursorToNodeBoundary(this.editor.get(0), true);
        var iterator = this.glyphs.makeFrontIterator();
        while (iterator.hasNext()) {
            iterator.next();
            this.renderGlyph(iterator);
        }
        this.cursor.maybeMoveCursorToNodeBoundary(this.glyph_iter.get(), false);
    };
    Editor.prototype.insertGlyph = function (char) {
        this.glyph_iter.insertAfter(new glyph_1.Glyph(char, new glyph_1.GlyphStyle()));
        this.glyph_iter.next();
    };
    Editor.prototype.deleteCurrentGlyph = function (forward) {
        var _this = this;
        var maybe_glyph = this.glyph_iter.get();
        maybe_glyph.caseOf({
            just: function (glyph) {
                var char = glyph.glyph;
                glyph.destroyNode();
                _this.glyph_iter.remove(forward); //removes the glyph entirely.
                console.log('removing forward');
                if (char === "\n") {
                    console.log("DELETING NEWLINE");
                    // Re render entire previous line to next newline.
                    var renderIterator_1 = _this.glyph_iter.clone();
                    var foundPrevLine_1 = false;
                    while (!foundPrevLine_1) {
                        renderIterator_1.get().caseOf({
                            just: function (glyph) {
                                if (glyph.glyph === "\n") {
                                    glyph.destroyNode(); // Clear out previous line, prepare to rerender.
                                    foundPrevLine_1 = true;
                                    renderIterator_1.prev(); // go back one to set cursor.
                                    console.log('found prev newline');
                                    _this.cursor.maybeMoveCursorToNodeBoundary(renderIterator_1.get(), false);
                                    console.log('ready to render');
                                    // render newline.
                                    renderIterator_1.next();
                                    _this.renderGlyph(renderIterator_1);
                                }
                                else {
                                    renderIterator_1.prev();
                                }
                            },
                            nothing: function () { }
                        });
                    }
                    //Once you've found the entire previous line, render the next line entirely.
                    var foundNextLine_1 = false;
                    while (!foundNextLine_1 && renderIterator_1.hasNext()) {
                        renderIterator_1.next();
                        renderIterator_1.get().caseOf({
                            just: function (glyph) {
                                if (glyph.glyph === "\n") {
                                    console.log('found next line');
                                    foundNextLine_1 = true;
                                }
                                else {
                                    console.log('rerendering glyph: ' + glyph.glyph);
                                    glyph.destroyNode();
                                    _this.renderGlyph(renderIterator_1);
                                }
                            },
                            nothing: function () { }
                        });
                    }
                }
                else {
                }
                _this.cursor.maybeMoveCursorToNodeBoundary(_this.glyph_iter.get(), false);
            },
            nothing: function () {
            }
        });
    };
    Editor.prototype.rerenderCurrentGlyph = function () {
        this.rerenderGlyph(this.glyph_iter);
    };
    Editor.prototype.rerenderGlyph = function (iter) {
        var _this = this;
        var maybe_glyph = iter.get();
        maybe_glyph.caseOf({
            just: function (glyph) {
                if (glyph.glyph === "\n") {
                    // Newline requires special handling for enter. Need to delete previous line
                    // IF it exists and then render next two lines.
                    var iterator_1 = iter.clone();
                    var foundPrevLine_2 = false;
                    while (iterator_1.hasPrev() && !foundPrevLine_2) {
                        iterator_1.prev();
                        iterator_1.get().caseOf({
                            just: function (glyph) {
                                if (glyph.glyph === "\n") {
                                    foundPrevLine_2 = true;
                                    glyph.getNode().caseOf({
                                        just: function (node) {
                                            jquery_1.default(node).remove();
                                        },
                                        nothing: function () { }
                                    });
                                }
                                else {
                                    // Do nothing. We will delete the entire line shortly.
                                }
                            },
                            nothing: function () { }
                        });
                    }
                    if (foundPrevLine_2) {
                        iterator_1.prev();
                        _this.cursor.maybeMoveCursorToNodeBoundary(iterator_1.get(), false);
                        // render next two lines
                        var lineCount_1 = 0;
                        while (iterator_1.hasNext() && lineCount_1 < 3) {
                            iterator_1.next();
                            iterator_1.get().caseOf({
                                just: function (glyph) {
                                    if (glyph.glyph === "\n") {
                                        lineCount_1 += 1;
                                    }
                                    _this.renderGlyph(iterator_1); // THIS LEADS TO RECURSION
                                },
                                nothing: function () {
                                }
                            });
                        }
                    }
                    else {
                        // If no previous line, then just render the new line.
                        _this.renderGlyph(iter);
                    }
                }
                else {
                    _this.renderGlyph(iter);
                }
            },
            nothing: function () {
                console.log("No glyph to rerender");
            }
        });
    };
    /**
     * @todo FIX. Recursive because for Enter, need to keep writing. NEED A rerenderGlyph
     *       function for this, to avoid recursion.
     * @param iter
     */
    Editor.prototype.renderGlyph = function (iter) {
        var _this = this;
        var maybe_glyph = iter.get();
        maybe_glyph.caseOf({
            just: function (glyph) {
                console.log(glyph.glyph);
                glyph.destroyNode();
                var node = glyph.toNode();
                _this.cursor.insertNode(node);
            },
            nothing: function () {
                console.log("No glyph to render");
            }
        });
    };
    Editor.prototype.renderCurrentGlyph = function () {
        this.renderGlyph(this.glyph_iter);
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
