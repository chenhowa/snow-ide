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

import Handler from "editor/handlers/handler";
import ClickHandler from "editor/handlers/click-handler";


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
    cursor: Cursor = new Cursor();
    renderer: Renderer = new EditorRenderer();
    deleter: DeleteRenderer = new EditorDeleter(this.renderer);
    clicker: Handler = new ClickHandler(this.cursor);

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

    isChar(key: string): boolean {
        return key.length === 1;
    }

    isArrowKey(key: string): boolean {
        let keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
        for(let i = 0; i < keys.length; i++) {
            if(key === keys[i]) {
                return true;
            }
        }
        return false; 
    }

    run() {
        // We assume that a glyph that glyph_iter points to is the one that would be removed by BACKSPACE.
        // Hence the cursor will be IN FRONT of it.

        // Render initial state of document.
        this.rerender();

        let keydownObs = fromEvent(this.editor, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {
                let key: string = event.key;
                console.log("key: " +  key);
                console.log(event);
                if(this.isChar(key)) {
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
                    console.log('tab');
                    // TODO. Insert 4 \t glyphs to represent each space in a tab.
                    // This allows you to render each as a <span class='tab'> </span>
                    this.insertGlyph("\t");
                    event.preventDefault();
                } else if (this.isArrowKey(key)) {
                    // TODO. Move iterator to correct destination and then rerender the cursor.

                    this.updateCursorToCurrent();
                }

            },
            error: (err) => {},
            complete: () => {}
        });

        let clickObs = fromEvent(this.editor, 'click');
        let clickSub = clickObs.subscribe({
            next: (event: any) => {
                this.clicker.handle(event, this.glyphs.makeFrontIterator());
                this.clicker.getNewIterators().caseOf({
                    just: (iter) => {
                        this.glyph_iter = iter;
                    },
                    nothing: () => {
                        this.glyph_iter = this.glyphs.makeFrontIterator();
                        if(this.glyph_iter.hasNext()) {
                            this.glyph_iter.next();
                        } else {
                            throw new Error("Empty list. Need newline");
                        }
                    }
                });
                this.updateCursorToCurrent();
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