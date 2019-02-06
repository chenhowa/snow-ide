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

import { KeyPressMap, EditorKeyPressMap } from "editor/keypress-map";


class Editor {
    glyphs: List<Glyph>;
    start_glyph_iter: DoubleIterator<Glyph>;
    end_glyph_iter: DoubleIterator<Glyph>;
    editor: JQuery<HTMLElement>;
    cursor: Cursor = new Cursor();
    renderer: Renderer = new EditorRenderer();
    deleter: DeleteRenderer = new EditorDeleter(this.renderer);
    clicker: Handler;
    keypress_map: KeyPressMap = new EditorKeyPressMap();
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
        this.start_glyph_iter = this.glyphs.makeFrontIterator();
        this.end_glyph_iter = this.glyphs.makeFrontIterator();
        this.keydowner = new KeydownHandler(
                            this.renderer, this.deleter, 
                            this.cursor, this.editor.get(0), this.keypress_map
        );
        this.clicker = new ClickHandler(this.cursor, this.editor.get(0));
        
        if(this.valid()) {
            this.reset();
        }
    }

    reset(): void {
        this.editor.empty();
        this.editor.attr('spellcheck', 'false');
        this.glyphs.empty();
        this.end_glyph_iter = this.glyphs.makeFrontIterator();
        this.end_glyph_iter.insertAfter(new Glyph('\n', new GlyphStyle()));
        this.end_glyph_iter.next();
        this.end_glyph_iter.insertAfter(new Glyph('a', new GlyphStyle()));
        this.end_glyph_iter.next(); // We stay pointing at 'a', so cursor should be between a and b
        this.start_glyph_iter = this.end_glyph_iter.clone();
        this.end_glyph_iter.insertAfter(new Glyph('b', new GlyphStyle()));
        this.rerender();
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

        let keyupObs = fromEvent(this.editor, 'keyup');
        let keyupSub = keyupObs.subscribe({
            next: (event: any) => {
                let key: string = event.key;
                switch(key) {
                    case "Control": {
                        this.keypress_map.Control = false;
                    }
                }
            },
            error: (err) => {},
            complete: () => {}
        });

        let keydownObs = fromEvent(this.editor, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {

                this.keydowner.handle(event, this.end_glyph_iter.clone());
                this._updateIteratorsFromHandler(this.keydowner);
                this.updateCursorToCurrent();
            },
            error: (err) => {},
            complete: () => {}
        });

        let clickObs = fromEvent(this.editor, 'click');
        let clickSub = clickObs.subscribe({
            next: (event: any) => {
                this.clicker.handle(event, this.glyphs.makeFrontIterator());
                this._updateIteratorsFromHandler(this.clicker);
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

    _updateIteratorsFromHandler(handler: Handler) {
        console.log("start");
        handler.getNewIterators().caseOf({
            just: (iter) => {
                iter.get().caseOf({
                    just: (glyph) => {
                        console.log(glyph);
                    },
                    nothing: () => {
                        console.log("actually nothing");
                    }
                });
                this.start_glyph_iter = iter;
            },
            nothing: () => {
                console.log("nothing");
                this.start_glyph_iter = this.glyphs.makeFrontIterator();
                if(this.start_glyph_iter.hasNext()) {
                    this.start_glyph_iter.next();
                } else {
                    throw new Error("Empty list. Need newline");
                }
            }
        });
        console.log("end");
        handler.getEndIterator().caseOf({
            just: (iter) => {
                iter.get().caseOf({
                    just: (glyph) => {
                        console.log(glyph);
                    },
                    nothing: () => {
                        console.log("actually nothing");
                    }
                });
                this.end_glyph_iter = iter;
            },
            nothing: () => {
                console.log("nothing");
                this.end_glyph_iter = this.start_glyph_iter.clone();
            }
        });
    }

    /**
     * @description Updates cursor to be right after character of this.glyph_iter.
     *              For visual feedback only.
     */
    updateCursorToCurrent() {
        this.updateCursor(this.start_glyph_iter, this.end_glyph_iter);
    }

    /**
     * @description Updates cursor to be RIGHT AFTER character that iterator is pointing to.
     *              THIS IS FOR VISUAL FEEDBACK ONLY. Cursor placement is inaccurate and tricky. Don't use for data manip.
     * @param source_start
     * @param source_end 
     */
    updateCursor(source_start: DoubleIterator<Glyph>, source_end: DoubleIterator<Glyph>) {
        // THIS IS FOR VISUAL FEEDBACK TO USER ONLY.
        // Using the cursor for direct insert is error prone, as it may be misplaced.
        let start = source_start.clone();
        let end = source_end.clone();

        if(start.equals(end)) {
            // If both start and end point to the same glyph, we collapse the cursor to one.
            end.get().caseOf({
                just: (glyph) => {
                    if(glyph.glyph === Strings.newline) {
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
                    // This should only happen when end_glyph_iter is at front sentinel..
                    // we attempt to repair state.
                    let temp = this.glyphs.makeFrontIterator();
                    if(temp.hasNext()) {
                        temp.next();
                        this.start_glyph_iter = temp.clone();
                        this.end_glyph_iter = temp.clone();
    
                        this.updateCursor(this.start_glyph_iter, this.end_glyph_iter);
                    } else {
                        throw new Error("Found empty glyph. Could not move cursor to it. Could not repair");
                    }
                }
            });
        } else {
            // If start and end are not equal, we ASSUME that start is before end,
            // and we update the selection to reflect this. We also
            // assume, for now, that start and end are guaranteed to be pointing
            // to valid nodes (not sentinel and not empty);
            let start_glyph = start.grab();
            let end_glyph = end.grab();

            console.log("START ANCHOR");
            console.log(start_glyph);

            console.log("END ANCHOR");
            console.log(end_glyph);

            this.cursor.selection.empty();
            let range = new Range();

            start_glyph.getNode().caseOf({
                just: (start_node) => {
                    console.log("Set start");
                    console.log(start_node);
                    if($(start_node).hasClass(Strings.lineName())) {
                        let firstGlyph = $(start_node).children(Strings.glyphSelector()).first();
                        if(firstGlyph.length > 0 ) {
                            start_node = firstGlyph.get(0);
                        } else {
                            throw new Error("line's first span does not exist");
                        }
                    }
                    range.setStart(start_node, start_node.childNodes.length);
                },
                nothing: () => {
                    // For now, do nothing.
                }
            });

            end_glyph.getNode().caseOf({
                just: (end_node) => {
                    console.log("Set end");
                    console.log(end_node);
                    if($(end_node).hasClass(Strings.lineName())) {
                        let firstGlyph = $(end_node).children(Strings.glyphSelector()).first();
                        if(firstGlyph.length > 0 ) {
                            end_node = firstGlyph.get(0);
                        } else {
                            throw new Error("line's first span does not exist");
                        }
                    }
                    range.setEnd(end_node, end_node.childNodes.length);
                },
                nothing: () => {

                }
            });

            this.cursor.selection.addRange(range);
        }

        
    }


}


export default Editor;