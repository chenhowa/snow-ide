import { Maybe } from "tsmonad";
import { splice, repeat } from 'voca';
import $ from "jquery";
import Cursor from 'editor/cursor';
import { Glyph, ToNode, GlyphStyle } from 'editor/glyph';
import { LinkedList, List, DoubleIterator } from 'data_structures/linked-list';
import { fromEvent } from 'rxjs';
import Strings from "string-map";
import { Renderer, EditorRenderer } from "editor/renderer";
import { DeleteRenderer, EditorDeleter } from "editor/deleter";


/*
    TODO : Ensure click leads to correct iterator. It currently does not.

    TODO : Always have all the lines created, with the accompanying lines.
           Only show them from the first line to the farthest line that
           has text.
*/

class Editor {
    glyphs: List<Glyph>;
    glyph_iter: DoubleIterator<Glyph>
    editor: JQuery<HTMLElement>;
    cursor: Cursor;
    renderer: Renderer = new EditorRenderer();
    deleter: DeleteRenderer = new EditorDeleter(this.renderer);

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
        this.glyph_iter.insertAfter(new Glyph('a', new GlyphStyle()));
        this.glyph_iter.next(); // We stay pointing at 'a', so cursor should be between a and b
        this.glyph_iter.insertAfter(new Glyph('b', new GlyphStyle()));
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
                        this.updateCursorToCurrent();
                        event.preventDefault();
                    }
                } else if (key === 'Backspace') {
                    if(this.cursor.isCollapsed()) {
                        this.deleteCurrentGlyphAndRerender(false);
                        event.preventDefault();
                    }
                } else if (key === 'Enter') {
                    this.insertGlyph("\n");
                    // Renders glyph by rerendering current line and new line.
                    this.rerenderCurrentGlyph();
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

        let iterator = this.glyphs.makeFrontIterator();
        while(iterator.hasNext()) {
            iterator.next();
            this.renderGlyph(iterator);
        }

        this.updateCursorToCurrent(); // Initially is between a and b!

    }


    insertGlyph(char: string) {
        this.glyph_iter.insertAfter(new Glyph(char, new GlyphStyle()));
        this.glyph_iter.next();
    }

    /**
     * @description -- deletes the current glyph and rerenders document
     * @param forward boolean that indicates direction in which to move after deletion.
     *                true indicates forward, false indicates backward.
     */
    deleteCurrentGlyphAndRerender(forward: boolean) {
        this.deleteGlyphAndRerender(this.glyph_iter, forward);
    }

    deleteGlyphAndRerender(iter: DoubleIterator<Glyph>, direction: boolean) {
        this.deleter.deleteAndRender(iter, this.editor.get(0), direction);
        this.updateCursorToCurrent();
    }

    rerenderCurrentGlyph() {
        this.rerenderGlyph(this.glyph_iter);
    }

    rerenderGlyph(iter: DoubleIterator<Glyph>) {
        this.renderer.rerender(iter, this.editor.get(0));

        this.updateCursorToCurrent();
    }

    /**
     * Renders glyph pointed at by the this.glyph_iter iterator.
     */
    renderCurrentGlyph() {
        this.renderGlyph(this.glyph_iter);
    }


    /**
     * @desciption - Renders glyph in DOM based on the surrounding nodes.
     * @param iter 
     */
    renderGlyph(iter: DoubleIterator<Glyph>) {
        this.renderer.render(iter, this.editor.get(0));
    }

    /**
     * @description Updates cursor to be right after character of this.glyph_iter
     */
    updateCursorToCurrent() {
        this.updateCursor(this.glyph_iter);
    }

    /**
     * @description Updates cursor to be RIGHT AFTER character that iterator is pointing to.
     *              THIS IS FOR VISUAL FEEDBACK ONLY. Cursor placement is inaccurate and tricky. Don't use for data manip.
     * @param iter 
     */
    updateCursor(iter: DoubleIterator<Glyph>) {
        // THIS IS FOR VISUAL FEEDBACK TO USER ONLY.
        // Using the cursor for direct insert is error prone, as it may be misplaced.
        iter.get().caseOf({
            just: (glyph) => {
                if(glyph.glyph === "\n") {
                    glyph.getNode().caseOf({
                        just: (newlineNode) => {
                            let glyphNode = $(newlineNode).children(Strings.glyphSelector()).first();
                            if(glyphNode.length > 0) {
                                this.cursor.moveCursorToNodeBoundary(glyphNode.get(0), false);
                            } else {
                                throw new Error("DID NOT FIND A HIDDEN SPAN IN LINE DIV");
                            }
                            
                        },  
                        nothing: () => {}
                    });
                } else {
                    // Otherwise we just move cursor to node, if it has been rendered.
                    glyph.getNode().caseOf({
                        just: (spanNode) => {
                            this.cursor.moveCursorToNodeBoundary(spanNode, false);
                        },
                        nothing: () => {}
                    })
                }
            },
            nothing: () => {
                console.log ("updateCursor failed. Iterator did not get glyph");
                // This should only happen when glyph_iter is at front sentinel..
                if(iter.hasNext()) {
                    iter.next();

                    this.updateCursor(iter);
                }
            }
        })
    }


}


export default Editor;