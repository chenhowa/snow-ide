import { Maybe } from "tsmonad";
import { splice, repeat } from 'voca';
import $ from "jquery";
import Cursor from 'editor/cursor';
import { Glyph, ToNode, GlyphStyle } from 'editor/glyph';
import { LinkedList, List, DoubleIterator } from 'data_structures/linked-list';
import { fromEvent } from 'rxjs';
import Strings from "string-map";


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
            this.reset();
        }
    }

    reset(): void {
        this.editor.empty();
        this.editor.attr('spellcheck', 'false');
        this.glyphs.empty();
        this.glyph_iter = this.glyphs.makeFrontIterator();
        this.glyph_iter.insertAfter(new Glyph('\n', new GlyphStyle()));
        this.glyph_iter.next();

        this.rerender();
    }

    getDocument(): Array<string> {
        return this.glyphs.asArray().map((glyph) => {
            return glyph.glyph;
        })
    }

    valid(): boolean {
        return this.editor.length !== 0;
    }

    run() {
        // We assume that a glyph that glyph_iter points to is the one that would be removed by BACKSPACE.
        // Hence the cursor will be IN FRONT of it.

        // Render initial state of document.
        this.rerender();

        let thisEditor = this;
        let keydownObs = fromEvent(this.editor, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {
                let key: string = event.key;
                if(key.length === 1) {
                    if(this.cursor.isCollapsed()) {
                        this.insertGlyph(key);
                        this.renderCurrentGlyph();
                        this.cursor.maybeMoveCursorToNodeBoundary(this.glyph_iter.get(), false);
                        event.preventDefault();
                    }
                } else if (key === 'Backspace') {
                    if(this.cursor.isCollapsed()) {
                        this.deleteCurrentGlyph(false);
                        this.glyph_iter.get().caseOf({
                            just: (glyph) => {
                                glyph.getNode().caseOf({
                                    just: (node) => {
                                        if(glyph.glyph === "\n") {
                                            // We need to move to first glyph child of newline
                                            let firstSpan = $(node).children(Strings.glyphSelector()).first();
                                            this.cursor.moveCursorToNodeBoundary(firstSpan.get(0), false);
                                        } else {
                                            this.cursor.moveCursorToNodeBoundary(node, false);
                                        }
                                    },
                                    nothing: () => {
                                        // do nothing. Cannot move.
                                    }
                                });
                            },
                            nothing: () => { // Do nothing. Cannot move 
                            
                            } 
                        });

                        event.preventDefault();
                    }
                } else if (key === 'Enter') {
                    this.insertGlyph("\n");
                    // Renders glyph by rerendering the next two lines.
                    this.rerenderCurrentGlyph(); // renders glyph as div and span, and inserts.
                    event.preventDefault();
                } else if (key === 'Tab') {
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
                console.log(event);
                console.log(this.cursor.selection);
                let target: JQuery<HTMLElement> = $(event.target);
                if(target.hasClass(Strings.editorName())) {
                    let selectionNode = $(this.cursor.selection.anchorNode);
                    if(selectionNode.hasClass(Strings.glyphName())) {
                        let targetNode = selectionNode.get(0);
                        let iterator = this.glyphs.find((glyph: ToNode) => {
                            let match = false;
                            glyph.getNode().caseOf({
                                just: (node) => {
                                    match = targetNode === node;
                                },
                                nothing: () => {}
                            })
                            return match;
                        });
                        this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), false);
                    } else if ( selectionNode.get(0).nodeType === 3 ) {
                        let targetNode = selectionNode.parent(Strings.glyphSelector()).first().get(0);
                        let iterator = this.glyphs.find((glyph: ToNode) => {
                            let match = false;
                            glyph.getNode().caseOf({
                                just: (node) => {
                                    match = targetNode === node;
                                },
                                nothing: () => {}
                            })
                            return match;
                        });
                        this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), false);
                    } else {
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
                        }
                    }
                } else if (target.hasClass(Strings.lineName())) {
                    console.log('moving to line');

                } else if (target.hasClass(Strings.glyphName())) { 
                    console.log('moving to glyph');
                    // Have to use selection to get correct cursor position
                    let toStart = this.cursor.selection.anchorOffset === 0;
                    let targetNode = $(this.cursor.selection.anchorNode).parent(Strings.glyphSelector()).first().get(0);
                    let iterator = this.glyphs.find((glyph: ToNode) => {
                        let match = false;
                        glyph.getNode().caseOf({
                            just: (node) => {
                                match = targetNode === node;
                            },
                            nothing: () => {}
                        })
                        return match;
                    });
                    this.glyph_iter = iterator;
                    this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), toStart);

                } else if (target.get(0).nodeType === 3) {
                    // Was text node, so it should be in a span.
                    let node = target.parent(Strings.glyphSelector()).first();
                    if(node.length > 0) {
                        let targetNode = node.get(0);
                        let iterator = this.glyphs.find((glyph: ToNode) => {
                            let match = false;
                            glyph.getNode().caseOf({
                                just: (node) => {
                                    match = targetNode === node;
                                },
                                nothing: () => {}
                            })
                            return match;
                        });
                        
                        this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), false);
                        console.log(this.cursor.selection);
                    }

                } else {
                    console.log("NOT RECOGNIZED CLICK");
                    let firstLine = thisEditor.editor.children(".first-line").get(0);
                    this.cursor.moveCursorToNodeBoundary(firstLine, false);
                }

                console.log(this.glyph_iter.grab());
            },
            error: (err) => {},
            complete: () => {}
        });

        let focusObs = fromEvent(this.editor, 'focus');
        let focusSub = focusObs.subscribe({
            next: (event: any) => {
            },
            error: (err) => {},
            complete: () => {}
        });
    }

    rerender() {
        this.editor.empty();

        this.cursor.moveCursorToNodeBoundary(this.editor.get(0), true);

        let iterator = this.glyphs.makeFrontIterator();
        while(iterator.hasNext()) {
            iterator.next();
            this.renderGlyph(iterator);
        }

        this.cursor.maybeMoveCursorToNodeBoundary(this.glyph_iter.get(), false);
    }


    insertGlyph(char: string) {
        this.glyph_iter.insertAfter(new Glyph(char, new GlyphStyle()));
        this.glyph_iter.next();
    }

    deleteCurrentGlyph(forward: boolean) {
        let maybe_glyph = this.glyph_iter.get();
        maybe_glyph.caseOf({
            just: (glyph) => {
                let char = glyph.glyph;
                glyph.destroyNode();
                this.glyph_iter.remove(forward); //removes the glyph entirely.
                console.log('removing forward');
                if(char === "\n") {
                    console.log("DELETING NEWLINE");

                    // Re render entire previous line to next newline.
                    let renderIterator = this.glyph_iter.clone();
                    let foundPrevLine = false;
                    while(!foundPrevLine) {
                        renderIterator.get().caseOf({
                            just: (glyph) => {
                                if(glyph.glyph === "\n") {
                                    glyph.destroyNode(); // Clear out previous line, prepare to rerender.
                                    foundPrevLine = true;
                                    renderIterator.prev(); // go back one to set cursor.
                                    console.log('found prev newline');
                                    this.cursor.maybeMoveCursorToNodeBoundary(renderIterator.get(), false);
                                    console.log('ready to render');

                                    // render newline.
                                    renderIterator.next();
                                    this.renderGlyph(renderIterator);
                                } else {
                                    renderIterator.prev();
                                }
                            },
                            nothing: () => {}
                        });
                    }

                    //Once you've found the entire previous line, render the next line entirely.
                    let foundNextLine = false;
                    while(!foundNextLine && renderIterator.hasNext()) {
                        renderIterator.next();
                        renderIterator.get().caseOf({
                            just: (glyph) => {
                                if(glyph.glyph === "\n") {
                                    console.log('found next line');
                                    foundNextLine = true;
                                } else {
                                    console.log('rerendering glyph: ' + glyph.glyph);
                                    glyph.destroyNode();
                                    this.renderGlyph(renderIterator);
                                }
                            },
                            nothing: () => {}
                        });
                    }
                } else {

                }
                this.cursor.maybeMoveCursorToNodeBoundary(this.glyph_iter.get(), false);
            },
            nothing: () => {

            }
        });
    }

    rerenderCurrentGlyph() {
        this.rerenderGlyph(this.glyph_iter);
    }

    rerenderGlyph(iter: DoubleIterator<Glyph>) {
        let maybe_glyph = iter.get();
        maybe_glyph.caseOf({
            just: (glyph) => {
                if(glyph.glyph === "\n") {
                    // Newline requires special handling for enter. Need to delete previous line
                    // IF it exists and then render next two lines.
                    let iterator = iter.clone();
                    let foundPrevLine = false;
                    while(iterator.hasPrev() && !foundPrevLine) {
                        iterator.prev();
                        iterator.get().caseOf({
                            just: (glyph) => {
                                if(glyph.glyph === "\n") {
                                    foundPrevLine = true;
                                    glyph.getNode().caseOf({
                                        just: (node) => {
                                            $(node).remove();
                                        },
                                        nothing: () => {}
                                    });
                                } else {
                                    // Do nothing. We will delete the entire line shortly.
                                }
                            }, 
                            nothing: () => {}
                        });
                    }

                    if(foundPrevLine) {
                        iterator.prev();
                        this.cursor.maybeMoveCursorToNodeBoundary(iterator.get(), false);
                        // render next two lines
                        let lineCount = 0;
                        while(iterator.hasNext() && lineCount < 3) {
                            iterator.next();
                            iterator.get().caseOf({
                                just: (glyph) => {
                                    if(glyph.glyph === "\n") {
                                        lineCount += 1;
                                    }
                                    this.renderGlyph(iterator); // THIS LEADS TO RECURSION
                                },
                                nothing: () => {

                                }
                            })
                        }
                    } else {
                        // If no previous line, then just render the new line.
                        this.renderGlyph(iter);
                    }
                } else {
                    // just render glyph if needed.
                    this.renderGlyph(iter);
                }
            },
            nothing: () => {
                console.log("No glyph to rerender");
            }
        });
    }


    /**
     * @todo FIX. Recursive because for Enter, need to keep writing. NEED A rerenderGlyph
     *       function for this, to avoid recursion.
     * @param iter 
     */
    renderGlyph(iter: DoubleIterator<Glyph>) {
        // To render a glyph, need to correctly set cursor based on previous glyph.
        this.updateCursor(iter);

        let maybe_glyph = iter.get();
        maybe_glyph.caseOf({
            just: (glyph) => {
                console.log(glyph.glyph);
                glyph.destroyNode();
                let node = glyph.toNode();
                this.cursor.insertNode(node);
            },
            nothing: () => {
                console.log("No glyph to render");
            }
        });
    }

    renderCurrentGlyph() {
        this.renderGlyph(this.glyph_iter);
    }
}


export default Editor;