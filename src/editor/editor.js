"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var voca_1 = require("voca");
var jquery_1 = __importDefault(require("jquery"));
var cursor_1 = __importDefault(require("editor/cursor"));
var glyph_1 = require("editor/glyph");
var linked_list_1 = require("data_structures/linked-list");
var rxjs_1 = require("rxjs");
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
            this.editor.empty();
            this.editor.attr('spellcheck', 'false');
            var line = this._insertFirstNewLine();
            /*
            this._insertNewLines(80);*/
        }
    }
    Editor.prototype.valid = function () {
        return this.editor.length !== 0;
    };
    Editor.prototype._insertFirstNewLine = function () {
        var firstNewLine = this.insertNewLine();
        firstNewLine.addClass('first-line');
        return firstNewLine;
    };
    // Inserts a bootstrap row.
    Editor.prototype.insertNewLine = function () {
        /*this.maxLines += 1;*/
        var line = jquery_1.default("<div></div>");
        line.addClass('line');
        this.editor.append(line);
        return line;
    };
    Editor.prototype._insertNewLines = function (num) {
        for (var i = 0; i < num; i++) {
            this.insertNewLine();
        }
    };
    Editor.prototype.run = function () {
        // We assume that a glyph that glyph_iter points to is the one that would be removed by BACKSPACE.
        // Hence the cursor will be IN FRONT of it.
        var _this = this;
        var thisEditor = this;
        var keydownObs = rxjs_1.fromEvent(this.editor, 'keydown');
        var keydownSub = keydownObs.subscribe({
            next: function (event) {
                console.log(_this.cursor.selection);
                console.log(event);
                var key = event.key;
                if (key.length === 1) {
                    if (_this.cursor.isCollapsed()) {
                        _this.insertGlyph(key);
                        _this.renderCurrentGlyph();
                        _this.cursor.maybeMoveCursorToNodeBoundary(_this.glyph_iter.get(), false);
                        event.preventDefault();
                        console.log(_this.glyphs.asArray());
                    }
                }
                else if (key === 'Backspace') {
                    console.log('backspace');
                    if (_this.cursor.isCollapsed()) {
                        _this.deleteCurrentGlyph(false);
                        _this.cursor.maybeMoveCursorToNodeBoundary(_this.glyph_iter.get(), false);
                        console.log("deleted a char");
                        event.preventDefault();
                    }
                }
                else if (key === 'Enter') {
                    console.log('enter');
                    _this.insertGlyph("\n");
                    _this.renderCurrentGlyph();
                    console.log(_this.glyphs.asArray());
                    event.preventDefault();
                }
                else if (key === 'Tab') {
                    console.log('tab');
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
                var target = jquery_1.default(event.target);
                if (target.hasClass('preserve-whitespace')) {
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
                    else {
                        var firstLine = thisEditor.editor.children(".first-line").get(0);
                        _this.cursor.moveCursorToNodeBoundary(firstLine, false);
                        console.log(_this.cursor.selection);
                    }
                }
            },
            error: function (err) { },
            complete: function () { }
        });
        var focusObs = rxjs_1.fromEvent(this.editor, 'focus');
        var focusSub = focusObs.subscribe({
            next: function (event) {
                console.log("FOCUS");
                console.log(event);
            },
            error: function (err) { },
            complete: function () { }
        });
        /*let thisEditor = this;
        this.editor.click(function(event) {
            // move cursor to text.
            console.log(event);
            let node = $(event.target);
            if(node.hasClass('preserve-whitespace')) {
                // Check which node the selection got to, and put the cursor there.
                let selection = window.getSelection();
                if(selection.isCollapsed) {
                    // TODO : this finds the text node, potentially.
                    // We want to find the div so we can check the line-number attr.
                    //let node = $(selection.anchorNode).closest();
                    let lineNumber = node.attr('line-number');
                    if(lineNumber) {
                        let node = $("div.text[line-number='" + lineNumber + "']");
                        thisEditor.cursor.moveCursorToNodeBoundary(node.get(0), true);
                    } else {
                        console.log('no line number found');
                    }
                }
                console.log(window.getSelection());
                console.log('clicked editor');
            } else if (node.hasClass('line')) {

            } else if (node.hasClass('number')) {
                let text = node.next();
                let toStart = true;
                thisEditor.cursor.moveCursorToNodeBoundary(text.get(0), toStart );
            } else if (node.hasClass('text')) {

            }
        });*/
        /*
                this.editor.keydown(function(event) {
                    thisEditor._updateCurrentLine(); // get current line before registering any keys.
        
                    console.log(event.key);
                    if(event.key === 'Tab') {
                        event.preventDefault();
                        thisEditor.insertTab();
                    } else if (event.key === 'Enter') {
                        event.preventDefault();
                        let newLine = thisEditor.insertNewLine();
                        let toStart = true;
                        thisEditor.cursor.moveCursorToNodeBoundary(newLine.get(0), toStart);
                        thisEditor.editor.get(0).scrollTop = thisEditor.editor.get(0).scrollHeight;
                    } else if (event.key === 'Backspace') {
                        let selection = window.getSelection()
                        console.log(selection);
                        let node = $(selection.anchorNode);
                        let parentNode = node.parent();
                        let prevSibling = node.prev();
                        if( node.hasClass('first-line')) {
                            // Don't allow deletion of first line
                            event.preventDefault();
                        } else if (node.hasClass('line') ) {
                            // delete the div directly.
                            node.remove();
        
                            // put cursor in previous line div, in text if possible
                            let previousSiblingElements = prevSibling.contents().filter(function() {
                                return this.nodeType == Node.TEXT_NODE;
                            });
        
                            if(previousSiblingElements.length > 0) {
                                let toStart = false;
                                let lastElement = previousSiblingElements.get(previousSiblingElements.length - 1);
                                thisEditor.cursor.moveCursorToNodeBoundary(lastElement, toStart);
                            } else {
                                let toStart = false;
                                thisEditor.cursor.moveCursorToNodeBoundary(prevSibling.get(0), toStart);
                            }
                            event.preventDefault();
                        } else if (parentNode.hasClass('line')) {
                            if(node.text().length === 1) {
                                parentNode.text('');
                                event.preventDefault();
                            }
                        }
                    }
                });*/
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
                glyph.destroyNode();
                _this.glyph_iter.remove(forward);
            },
            nothing: function () {
            }
        });
    };
    Editor.prototype.renderCurrentGlyph = function () {
        var maybe_glyph = this.glyph_iter.get();
        var thisEditor = this;
        maybe_glyph.caseOf({
            just: function (glyph) {
                var node = glyph.toNode();
                thisEditor.cursor.insertNode(node);
            },
            nothing: function () {
            }
        });
    };
    Editor.prototype._updateCurrentLine = function () {
        var selection = window.getSelection();
        var lineAttr = jquery_1.default(selection.anchorNode).attr('line-number');
        if (lineAttr) {
            this.currentLine = parseInt(lineAttr);
        }
    };
    Editor.prototype.insertTab = function () {
        var selection = window.getSelection();
        console.log(selection);
        if (selection.isCollapsed) {
            this._insertTextInNodeAtOffset(selection.anchorNode, selection.baseOffset, Strings.tab());
        }
        else {
        }
    };
    Editor.prototype._insertTextInNodeAtOffset = function (node, offset, text) {
        if (node.textContent) {
            this._insertTextDirectlyToNode(node, offset, text);
            this.cursor.moveCursorToNode(node, offset + text.length);
        }
        else {
            var newNode = this._insertTextAsChildOfNode(node, text);
            var toStart = false;
            this.cursor.moveCursorToNodeBoundary(newNode, toStart);
        }
    };
    Editor.prototype._insertTextDirectlyToNode = function (node, offset, text) {
        if (node.textContent) {
            var content = voca_1.splice(node.textContent, offset, 0, voca_1.repeat(text, 1));
            node.textContent = content;
        }
        return node;
    };
    Editor.prototype._insertTextAsChildOfNode = function (node, text) {
        var insertText = document.createTextNode(voca_1.repeat(text, 1));
        node.appendChild(insertText);
        return insertText;
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
