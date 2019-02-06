
import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph, GlyphStyle } from "editor/glyph";
import Handler from "editor/handlers/handler";
import { Renderer } from "editor/renderer";
import { DeleteRenderer } from "editor/deleter";
import Cursor from "editor/cursor";
import Strings from "string-map";
import { getDistanceFromLineStart, findPreviousNewline } from "editor/editor-utils";

class KeydownHandler implements Handler {
    renderer: Renderer;
    deleter: DeleteRenderer;
    iterator: Maybe<DoubleIterator<Glyph>>
    cursor: Cursor;
    editor: Node;
    constructor(renderer: Renderer, deleter: DeleteRenderer, cursor: Cursor, editor: Node) {
        this.renderer = renderer;
        this.deleter = deleter;
        this.iterator = Maybe.nothing();
        this.cursor = cursor;
        this.editor = editor;
    }

    handle(event: any, source_iter: DoubleIterator<Glyph>) {
        this.iterator = Maybe.just(source_iter.clone()); // By default, don't move the iterator.

        let iter = source_iter.clone();
        let key: string = event.key;
        if(this._isChar(key)) {
            if(this.cursor.isCollapsed()) {
                this._insertGlyph(key, iter);
                this._renderGlyph(iter);
                this.iterator = Maybe.just(iter);
                event.preventDefault();
            }
        } else if (key === 'Backspace') {
            if(this.cursor.isCollapsed()) {
                let new_iter = this._deleteGlyphAndRerender(iter, false);
                this.iterator = Maybe.just(new_iter);
                event.preventDefault();
            }
        } else if (key === 'Enter') {
            if(this.cursor.isCollapsed()) {
                this._insertGlyph(Strings.newline, iter);
                // Renders glyph by rerendering current line and new line.
                this._rerenderGlyph(iter);
                this.iterator = Maybe.just(iter);

                event.preventDefault();
            }          
        } else if (key === 'Tab') {
            // TODO. Insert 4 \t glyphs to represent each space in a tab.
            // This allows you to render each as a <span class='tab'> </span>
            this._insertGlyph(Strings.tab, iter);
            event.preventDefault();
        } else if (this._isArrowKey(key)) {
            // TODO. Move iterator to correct destination and then rerender the cursor.
            this._handleArrowKey(key, iter);
            event.preventDefault();
        }
    }

    _isChar(key: string): boolean {
        return key.length === 1;
    }

    /**
     * @description - inserts the char as a glyph, and updates iterator to point at the new glyph.
     * @param char 
     * @param iter 
     */
    _insertGlyph(char: string, iter: DoubleIterator<Glyph>) {
        iter.insertAfter(new Glyph(char, new GlyphStyle()));
        iter.next();
    }

    /**
     * @desciption - Renders glyph in DOM based on the surrounding nodes.
     * @param iter 
     */
    _renderGlyph(iter: DoubleIterator<Glyph>) {
        this.renderer.render(iter, this.editor);
    }

    /**
     * @description - deletes the pointed at glyph and rerenders document
     * @param iter    NOT MODIFIED. Will modify iterator to move it to correct position.
     * @param direction true if delete and move forward, else go backward.
     */
    _deleteGlyphAndRerender(iter: DoubleIterator<Glyph>, direction: boolean): DoubleIterator<Glyph> {
        return this.deleter.deleteAndRender(iter, this.editor, direction);
    }

    /**
     * @description -- rerenders a glyph.
     * @param iter 
     */
    _rerenderGlyph(iter: DoubleIterator<Glyph>) {
        this.renderer.rerender(iter, this.editor);
    }

    _isArrowKey(key: string): boolean {
        let keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
        for(let i = 0; i < keys.length; i++) {
            if(key === keys[i]) {
                return true;
            }
        }
        return false; 
    }

    /**
     * @description: Use arrow key input to move iterator to correct location.
     * @param key 
     * @param iter 
     */
    _handleArrowKey(key: string, iter: DoubleIterator<Glyph> ): void {
        if(key === Strings.arrow.left) {
            if(iter.hasPrev()) {
                iter.prev();
                this.iterator = Maybe.just(iter);
            }
        } else if (key === Strings.arrow.right) {
            if(iter.hasNext()) {
                iter.next();
                this.iterator = Maybe.just(iter);
            }
        } else if (key === Strings.arrow.up) {
            let final_iter = iter.clone();
            getDistanceFromLineStart(iter).caseOf({
                just: (distance) => {
                    let move = false;
                    if(distance === 0) {
                        findPreviousNewline(iter).caseOf({
                            just: (new_iter) => {
                                final_iter = new_iter;
                            },
                            nothing: () => { }
                        });
                    } else {
                        findPreviousNewline(iter).caseOf({
                            just: (new_iter) => {
                                findPreviousNewline(new_iter).caseOf({
                                    just: (new_iter) => {
                                        final_iter = new_iter;
                                        move = true;
                                    },
                                    nothing: () => {

                                    }
                                });
                            },
                            nothing: () => {}
                        });

                        if(move) {
                            for(let i = 0; i < distance; i++) {
                                final_iter.next();
                                let done = final_iter.get().caseOf({
                                    just: (glyph) => {
                                        if(glyph.glyph === Strings.newline) {
                                            // If found newline, back up one.
                                            final_iter.prev();
                                            return true;
                                        }
                                    },
                                    nothing: () => {
                                        return false;
                                    }
                                });
                                if(done) {
                                    break;
                                }
                            }
                        }
                    }
                },
                nothing: () => {
                    throw new Error ("Document did not start with a line!");
                }
            });

            this.iterator = Maybe.just(final_iter);
        } else if (key === Strings.arrow.down) {
            // find previous newline to determine distance from line start
            getDistanceFromLineStart(iter).caseOf({
                just: (distance) => {
                    // now find start of next line (if any), and then
                    // walk the distance from the start.
                    let foundNext = false;
                    while(iter.hasNext() && !foundNext ) {
                        iter.next();
                        iter.get().caseOf({
                            just: (glyph) => {
                                if(glyph.glyph === Strings.newline) {
                                    foundNext = true;
                                }
                            },
                            nothing: () => { }
                        })
                    }

                    if(foundNext) {
                        // We found the next new line, or there was no next newline.
                        for(var i = 0; i < distance; i++) {
                            iter.next();
                            let tooFar = false;
                            iter.get().caseOf({
                                just: (glyph) => {
                                    if(glyph.glyph === Strings.newline) {
                                        tooFar = true;
                                    }
                                },
                                nothing: () => { }
                            });

                            if(tooFar) {
                                iter.prev(); // back off from the newline.
                                break;
                            }
                        }
                        this.iterator = Maybe.just(iter);
                    } else {
                        // If no next newline, do nothing.
                    }
                },
                nothing: () => {
                    throw new Error("doc does not start with newline");
                }
            });
        }
    }

    getNewIterators() : Maybe< DoubleIterator<Glyph> > {
        return this.iterator;
    }

}


export default KeydownHandler;