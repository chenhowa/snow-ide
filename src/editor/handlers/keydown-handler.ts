
import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph, GlyphStyle } from "editor/glyph";
import Handler from "editor/handlers/handler";
import { Renderer } from "editor/renderer";
import { DeleteRenderer } from "editor/deleter";
import Cursor from "editor/cursor";
import Strings from "string-map";
import { 
    getDistanceFromLineStart, 
    findPreviousNewline,
    findNextLineOrLast } from "editor/editor-utils";
import { KeyPressMap } from "editor/keypress-map";

class KeydownHandler implements Handler {
    renderer: Renderer;
    deleter: DeleteRenderer;
    start: Maybe<DoubleIterator<Glyph>>;
    end: Maybe<DoubleIterator<Glyph>>;
    cursor: Cursor;
    editor: Node;
    keypress_map: KeyPressMap;
    constructor(renderer: Renderer, deleter: DeleteRenderer, cursor: Cursor, editor: Node, map: KeyPressMap) {
        this.renderer = renderer;
        this.deleter = deleter;
        this.start = Maybe.nothing();
        this.end = Maybe.nothing();
        this.cursor = cursor;
        this.editor = editor;
        this.keypress_map = map;
    }

    handle(event: any, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>) {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        this.start = Maybe.just(source_start_iter.clone()); // By default, don't move the iterator.
        this.end = Maybe.just(source_end_iter.clone());
        let key: string = event.key;

        if(key === "Control") {
            this.keypress_map.Control = true;
            event.preventDefault(); // Do not want to destroy the selection??
            return;
        }

        let new_iters: Array<DoubleIterator<Glyph>>;

        if(this._controlPressed()) {
            new_iters = this._handleKeyWithControl(event, key, start_iter, end_iter);
        } else {
            new_iters = this._handleKeyAlone(event, key, start_iter, end_iter);
        }
        this.start = Maybe.just( new_iters[0] );
        this.end = Maybe.just( new_iters[1] );
    }

    _controlPressed() {
        return this.keypress_map.Control;
    }

    _handleKeyWithControl(event: any, key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                    : Array<DoubleIterator<Glyph>> {
        // If control was pressed, do nothing? Does that let default happen?
        // TODO: Allow operations of copy, paste, etc.
        console.log("HANDLING WITH CONTROL");
        return [source_start_iter.clone(), source_end_iter.clone()];
    }

    _handleKeyAlone(event: any, key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                    : Array<DoubleIterator<Glyph>> {
        
        if(this._isChar(key)) {
            if(this.cursor.isCollapsed()) {
                let new_iters: Array<DoubleIterator<Glyph>> = this._insertGlyph(key, source_start_iter, source_end_iter);
                let start_iter = new_iters[0];
                this._renderGlyph(start_iter, start_iter);  // TODO: render the single glyph by passing in BOTH iterators, as as general case.
                event.preventDefault();

                return new_iters;
            }
        } else if (key === 'Backspace') {
            if(this.cursor.isCollapsed()) {
                let new_iters: Array<DoubleIterator<Glyph>> = this._deleteGlyphAndRerender(source_start_iter, source_end_iter, false);
                event.preventDefault();
                return new_iters;
            }
        } else if (key === 'Enter') {
            if(this.cursor.isCollapsed()) {
                let new_iters: Array<DoubleIterator<Glyph>> = this._insertGlyph(Strings.newline, source_start_iter, source_end_iter);
                // Renders glyph by rerendering current line and new line.
                let start_iter = new_iters[0];
                this._rerenderGlyph(start_iter);

                event.preventDefault();

                return new_iters;
            }          
        } else if (this._isArrowKey(key)) {
            // TODO. Move iterator to correct destination and then rerender the cursor.
            event.preventDefault();
            return this._handleArrowKey(key, source_start_iter, source_end_iter);
        }

        return [source_start_iter.clone(), source_end_iter.clone()];
    }

    _isChar(key: string): boolean {
        return key.length === 1;
    }

    /**
     * @description - inserts the char as a glyph, and updates iterator to point at the new glyph.
     * @param char 
     * @param start_iter NOT MODIFIED
     * @param end_iter - NOT MODIFIED
     */
    _insertGlyph(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> ): Array<DoubleIterator<Glyph>> {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();

        if(start_iter.equals(end_iter)) {
            start_iter.insertAfter(new Glyph(char, new GlyphStyle()));
            start_iter.next();
            end_iter.next();
        }

        return [start_iter, end_iter];
        
    }

    /**
     * @desciption - Renders single glyph in DOM based on the surrounding nodes.
     * @param iter - not modified. 
     */
    _renderGlyph(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>) {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        this.renderer.render(start_iter, end_iter, this.editor);
    }

    /**
     * @description - deletes the pointed at glyph and rerenders document
     * @param start_iter    NOT MODIFIED. Will modify iterator to move it to correct position.
     * @param direction true if delete and move forward, else go backward.
     */
    _deleteGlyphAndRerender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, direction: boolean)
                                                                    : Array< DoubleIterator<Glyph> > {
        return this.deleter.deleteAndRender(start_iter.clone(), end_iter.clone(), this.editor, direction);
    }

    /**
     * @description -- rerenders a glyph.
     * @param iter 
     */
    _rerenderGlyph(iter: DoubleIterator<Glyph>) {
        this.renderer.rerender(iter, iter, this.editor);
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
     * @param source_start_iter 
     */
    _handleArrowKey(key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                                                : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();                                                                            
        if(key === Strings.arrow.left) {
            return this._arrowLeft(start_iter, end_iter);
        } else if (key === Strings.arrow.right) {
            return this._arrowRight(start_iter, end_iter);
        } else if (key === Strings.arrow.up) {
            return this._arrowUp(start_iter, end_iter);
        } else if (key === Strings.arrow.down) {
            return this._arrowDown(start_iter, end_iter);
        } else {
            throw new Error("NOT AN ARROW KEY");
        }
    }

    _arrowLeft(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                            : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        if(start_iter.equals(end_iter)) {
            // Back both up by one if possible.
            if(start_iter.hasPrev()) {
                start_iter.prev();
                end_iter = start_iter.clone();
            }
        } else {
            // If selection, collapse end into start (left).
            end_iter = start_iter.clone();
        }
        return [start_iter.clone(), end_iter.clone()];
    }

    _arrowRight(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                            : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        if(start_iter.equals(end_iter)) {
            if(start_iter.hasNext()) {
                start_iter.next();
                end_iter = start_iter.clone();
            }
        } else {
            // If selection, collapse start into end (right)
            start_iter = end_iter.clone();
        }
        return [start_iter.clone(), end_iter.clone()];
    }

    _arrowUp(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                            : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();

        if(start_iter.equals(end_iter)) {
            let final_iter = start_iter.clone();
            getDistanceFromLineStart(start_iter).caseOf({
                just: (distance) => {
                    let move = false;
                    if(distance === 0) {
                        findPreviousNewline(start_iter).caseOf({
                            just: (new_iter) => {
                                final_iter = new_iter;
                            },
                            nothing: () => { }
                        });
                    } else {
                        findPreviousNewline(start_iter).caseOf({
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

            return [final_iter.clone(), final_iter.clone()];
        } else {
            // If selection, up will just go left.
            return this._arrowLeft(start_iter, end_iter);
        }
    }

    _arrowDown(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                            : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();

        if(start_iter.equals(end_iter)) {
            // find previous newline to determine distance from line start
            console.log("going down on collapsed");
            let final_iter = start_iter.clone();
            getDistanceFromLineStart(start_iter).caseOf({
                just: (distance) => {
                    let nextOrEndIter = findNextLineOrLast(start_iter);
                    console.log("next or end was ")
                    console.log(nextOrEndIter.grab());
                    let foundNext = nextOrEndIter.hasNext();

                    if(foundNext) {
                        // We found the next new line, or there was no next newline.
                        final_iter = nextOrEndIter.clone();
                        for(var i = 0; i < distance; i++) {
                            final_iter.next();
                            let tooFar = false;
                            final_iter.get().caseOf({
                                just: (glyph) => {
                                    if(glyph.glyph === Strings.newline) {
                                        tooFar = true;
                                    }
                                },
                                nothing: () => { }
                            });

                            if(tooFar) {
                                final_iter.prev(); // back off from the newline.
                                break;
                            }
                        }
                    } else {
                        // If no next line, we don't move.
                    }
                },
                nothing: () => {
                    throw new Error("doc does not start with newline");
                }
            });

            return [final_iter.clone(), final_iter.clone()];
        } else {
            // If selection, will just go right.
            console.log("DOWN BUT GOING RIGHT");
            return this._arrowRight(start_iter, end_iter);
        }

    }

    getStartIterator() : Maybe< DoubleIterator<Glyph> > {
        return this.start;
    }

    getEndIterator(): Maybe< DoubleIterator<Glyph> > {
        return this.end;
    }

}


export default KeydownHandler;