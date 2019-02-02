import { Maybe } from "tsmonad";
import { splice, repeat } from 'voca';
import $ from "jquery";
import Cursor from './cursor';

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

        if(this.valid()) {
            this.editor.empty();
            this.editor.attr('spellcheck', 'false');
            this._insertFirstNewLine();
            this._insertNewLines(80);
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
        this.maxLines += 1;

        let row = $("<div></div>");
        row.addClass('line');
        row.attr('line-number', this.maxLines.toString());

        let lineNumber = $("<div></div>");
        lineNumber.addClass('number');
        lineNumber.attr('line-number', this.maxLines.toString());
        lineNumber.text(this.maxLines.toString());
        row.append(lineNumber);

        let lineText = $("<div></div>");
        lineText.addClass('text');
        lineText.attr('line-number', this.maxLines.toString());
        row.append(lineText);
        this.editor.append(row);

        let separator = $("<div></div>");
        separator.addClass('separator');
        separator.attr('line-number', this.maxLines.toString());
        this.editor.append(separator);

        return lineText;
    }

    _insertNewLines(num: number) {
        for(let i = 0; i < num; i++) {
            this.insertNewLine();
        }
    }

    run() {
        let thisEditor = this;
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
                    let node = $(selection.anchorNode).closest();
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
        });
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