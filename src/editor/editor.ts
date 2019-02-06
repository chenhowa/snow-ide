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
import KeydownHandler from "editor/handlers/keydown-handler";


class Editor {
    glyphs: List<Glyph>;
    glyph_iter: DoubleIterator<Glyph>
    editor: JQuery<HTMLElement>;
    cursor: Cursor = new Cursor();
    renderer: Renderer = new EditorRenderer();
    deleter: DeleteRenderer = new EditorDeleter(this.renderer);
    clicker: Handler = new ClickHandler(this.cursor);
    keydowner: Handler;

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
        this.keydowner = new KeydownHandler(this.renderer, this.deleter, this.cursor, this.editor.get(0));
        
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

        let keydownObs = fromEvent(this.editor, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {
                this.keydowner.handle(event, this.glyph_iter.clone());
                this.keydowner.getNewIterators().caseOf({
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
            this.renderer.render(iterator, this.editor.get(0));
        }

        this.updateCursorToCurrent(); // Initially is between a and b!
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