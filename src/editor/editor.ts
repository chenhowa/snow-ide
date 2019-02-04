import { Maybe } from "tsmonad";
import { splice, repeat } from 'voca';
import $ from "jquery";
import Cursor from 'editor/cursor';
import { Glyph, ToNode, GlyphStyle } from 'editor/glyph';
import { LinkedList, List, DoubleIterator } from 'data_structures/linked-list';
import { fromEvent } from 'rxjs';

declare var Strings: any;

/*
    TODO : Handle Enter to insert new line where CURSOR is, not at the end of the document.
    TODO : Handle Enter to scroll only if cursor is at LAST LINE
    TODO : Handle how to track last line.

    TODO : Always have all the lines created, with the accompanying lines.
           Only show them from the first line to the farthest line that
           has text.
*/

class Editor {
    glyphs: List<Glyph>;
    glyph_iter: DoubleIterator<Glyph>
    editor: JQuery<HTMLElement>;
    cursor: Cursor;
    maxLines: number = 0;
    currentLine: number = 0;

    static new = function(editor_id?: string): Maybe<Editor> {
        let editor: Editor = new Editor(editor_id);
        if(editor.valid()) {
            return Maybe.just(editor);
        } else {
            return Maybe.nothing();
        }
    };

    constructor(editor_id?: string) {
        this.cursor = new Cursor();
        if(editor_id) {
            this.editor = $(editor_id);
        } else {
            this.editor = $('#editor');
        }

        this.glyphs = new LinkedList();
        this.glyph_iter = this.glyphs.makeFrontIterator();
        if(this.valid()) {
            this.editor.empty();
            this.editor.attr('spellcheck', 'false');
            let line = this._insertFirstNewLine();
            /*
            this._insertNewLines(80);*/
        }
    }

    valid(): boolean {
        return this.editor.length !== 0;
    }

    _insertFirstNewLine(): JQuery<HTMLElement> {
        let firstNewLine = this.insertNewLine();
        firstNewLine.addClass('first-line');

        return firstNewLine;
    }

    // Inserts a bootstrap row.
    insertNewLine(): JQuery<HTMLElement> {
        /*this.maxLines += 1;*/

        let line = $("<div></div>");
        line.addClass('line');
        this.editor.append(line);

        return line;
    }

    _insertNewLines(num: number) {
        for(let i = 0; i < num; i++) {
            this.insertNewLine();
        }
    }

    run() {
        // We assume that a glyph that glyph_iter points to is the one that would be removed by BACKSPACE.
        // Hence the cursor will be IN FRONT of it.

        let thisEditor = this;
        let keydownObs = fromEvent(this.editor, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {
                console.log(this.cursor.selection);
                console.log(event);
                let key: string = event.key;
                if(key.length === 1) {
                    if(this.cursor.isCollapsed()) {
                        this.insertGlyph(key);
                        this.renderCurrentGlyph();
                        this.cursor.maybeMoveCursorToNodeBoundary(this.glyph_iter.get(), false);
                        event.preventDefault();
                        console.log(this.glyphs.asArray());
                    }
                } else if (key === 'Backspace') {
                    console.log('backspace');
                    if(this.cursor.isCollapsed()) {
                        this.deleteCurrentGlyph(false);
                        this.cursor.maybeMoveCursorToNodeBoundary(this.glyph_iter.get(), false);

                        console.log("deleted a char");
                        event.preventDefault();
                    }
                } else if (key === 'Enter') {
                    console.log('enter');
                    this.insertGlyph("\n");
                    this.renderCurrentGlyph(); // renders glyph as an empty span
                    this.insertLineAfterCurrentGlyph();
                    /*this.currentLine += 1;
                    this.maxLines += 1;*/
                    console.log(this.glyphs.asArray());
                    event.preventDefault();
                } else if (key === 'Tab') {
                    console.log('tab');
                    this.insertGlyph("\t");
                    event.preventDefault();
                }
                
                
            },
            error: (err) => {},
            complete: () => {}
        });

        let clickObs = fromEvent(this.editor, 'click');
        let clickSub = clickObs.subscribe({
            next: (event: any) => {
                let target: JQuery<HTMLElement> = $(event.target);
                if(target.hasClass('preserve-whitespace')) {
                    // If we clicked outside the editor, for now, point the iterator
                    // at the first char of the first line, and then move cursor accordingly.
                    thisEditor.glyph_iter = thisEditor.glyphs.makeFrontIterator();
                    let count = 0;
                    if(thisEditor.glyph_iter.hasNext()) {
                        count += 1;
                        thisEditor.glyph_iter.next();
                        thisEditor.glyph_iter.get().caseOf({
                            just: (glyph) => {
                                glyph.node.caseOf({
                                    just:(node) => {
                                        this.cursor.moveCursorToNodeBoundary(node, true);
                                    },
                                    nothing: () => {
                                        console.log("Could not move cursor to glyph. Glyph had no rendered node");
                                    }
                                })
                                
                            },
                            nothing: () => {
                                console.log("Could not move cursor to glyph. Glyph was empty somehow");
                                // Do nothing. Hope for recovery.
                            }
                        });
                    } else {
                        let firstLine = thisEditor.editor.children(".first-line").get(0);
                        this.cursor.moveCursorToNodeBoundary(firstLine, false);
                        console.log(this.cursor.selection);
                    }
                }
            },
            error: (err) => {},
            complete: () => {}
        });

        let focusObs = fromEvent(this.editor, 'focus');
        let focusSub = focusObs.subscribe({
            next: (event: any) => {
                console.log("FOCUS");
                console.log(event);
            },
            error: (err) => {},
            complete: () => {}
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
    }

    insertLineAfterCurrentGlyph() {
        this.glyph_iter.get().caseOf({
            just: (glyph) => {
                glyph.node.caseOf({
                    just: (node) => {
                        // This node should be a span.
                        // TODO : find the parent line and insert a new line after it. Then maybe move cursor
                        // to within this new line.
                    },
                    nothing: () => {

                    }
                })
            },
            nothing: () => {

            }
        })
    }

    insertGlyph(char: string) {
        this.glyph_iter.insertAfter(new Glyph(char, new GlyphStyle()));
        this.glyph_iter.next();
    }

    deleteCurrentGlyph(forward: boolean) {
        let maybe_glyph = this.glyph_iter.get();
        maybe_glyph.caseOf({
            just: (glyph) => {
                glyph.destroyNode();
                this.glyph_iter.remove(forward);
            },
            nothing: () => {

            }
        });
    }

    renderCurrentGlyph() {
        let maybe_glyph = this.glyph_iter.get();
        let thisEditor = this;
        maybe_glyph.caseOf({
            just: function(glyph) {
                let node = glyph.toNode();
                thisEditor.cursor.insertNode(node);
            },
            nothing: function() {

            }
        })
    }

    _updateCurrentLine() {
        let selection = window.getSelection();
        let lineAttr = $(selection.anchorNode).attr('line-number');
        if(lineAttr) {
            this.currentLine = parseInt(lineAttr);
        }
    }

    insertTab() {
        let selection = window.getSelection();
        console.log(selection);
        if(selection.isCollapsed) {
            this._insertTextInNodeAtOffset(
                            selection.anchorNode, 
                            selection.baseOffset, 
                            Strings.tab() as string);
        } else {

        }
    }

    _insertTextInNodeAtOffset(node: Node, offset: number, text: string) {
        if(node.textContent) {
            this._insertTextDirectlyToNode(node, offset, text);
            this.cursor.moveCursorToNode(node, offset + text.length);
        } else {
            let newNode = this._insertTextAsChildOfNode(node, text);
            let toStart = false;
            this.cursor.moveCursorToNodeBoundary(newNode, toStart);
        }
    }

    _insertTextDirectlyToNode(node: Node, offset: number, text: string): Node {
        if(node.textContent) {
            let content: string = splice(node.textContent, offset, 0, repeat(text, 1) );
            node.textContent = content;
        }
        return node;
    }

    _insertTextAsChildOfNode(node: Node, text: string): Node {
        let insertText = document.createTextNode(repeat(text, 1));
        node.appendChild(insertText);
        return insertText;
    }
}


export default Editor;