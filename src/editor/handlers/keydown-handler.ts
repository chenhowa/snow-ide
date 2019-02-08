
import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph, GlyphStyle } from "editor/glyph";
import Handler from "editor/handlers/handler";
import { EditorExecutor } from "editor/editor_executors/editor-executor";
import Cursor from "editor/editor_executors/cursor";
import Strings from "string-map";
import { 
    getDistanceFromLineStart, 
    findPreviousNewline,
    findLineEnd,
} from "editor/editor_executors/editor-utils";
import { KeyPressMap } from "editor/keypress-map";

class KeydownHandler implements Handler {
    executor: EditorExecutor;
    start: Maybe<DoubleIterator<Glyph>> = Maybe.nothing();
    end: Maybe<DoubleIterator<Glyph>> = Maybe.nothing();
    cursor: Cursor;
    editor: Node;
    keypress_map: KeyPressMap;
    constructor(executor: EditorExecutor, cursor: Cursor, editor: Node, map: KeyPressMap) {
        this.executor = executor;
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
        
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        event.preventDefault(); 
        if(this._isChar(key)) {
            return this.executor.insertAndRender(key, start_iter, end_iter);
        } else if (key === 'Backspace') {
            return this.executor.deleteAndRender(start_iter, end_iter, false);
        } else if (key === 'Enter') {
            return this.executor.insertAndRerender(Strings.newline, source_start_iter, source_end_iter);  
        } else if (this._isArrowKey(key)) {
            // TODO. Move iterator to correct destination and then rerender the cursor.
            return this._handleArrowKey(key, source_start_iter, source_end_iter);
        } else {
            console.log("UNHANDLED KEY " + key);
        }

        return [source_start_iter.clone(), source_end_iter.clone()];
    }

    _isChar(key: string): boolean {
        return key.length === 1;
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
                    let line_end_iter = findLineEnd(start_iter);
                    let foundNext = line_end_iter.hasNext();

                    if(foundNext) {
                        // We found the next new line, or there was no next newline.
                        final_iter = line_end_iter.clone();
                        final_iter.next();
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