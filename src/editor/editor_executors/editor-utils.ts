import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";
import Strings from "string-map";
import { startWith } from "rxjs/operators";

/**
 * @description Count forwards to find distance to next newline character, MINUS 1
 *              If at line start, returns 0. If no next newline character, returns Nothing.
 * @returns     Nonnegative number.
 */
function getDistanceFromNextLine(source_iter: DoubleIterator<Glyph>): number {
    let iter = source_iter.clone();
    let count = 0;
    let done = false;
    while(iter.hasNext() && !done) {
        iter.next();
        iter.get().caseOf({
            just: (glyph) => {
                if(glyph.glyph === Strings.newline) {
                    done = true;
                } else {
                    count += 1;
                }
            },
            nothing: () => { }
        });
    }

    if(done) {
        return count + 1;
    } else {
        return count + 1;
    }
}

/**
 * @description Count backwards to find distance from new line. If at line start
 *              returns 0. If no line start, return Nothing.
 * @returns Maybe<nonegative number>
 */
function getDistanceFromLineStart(source_iter: DoubleIterator<Glyph>): Maybe<number> {
    let iter = source_iter.clone();
    let count = 0;
    let done = false;
    while(iter.isValid() && !done) {
        iter.get().caseOf({
            just: (glyph) => {
                if(glyph.glyph === Strings.newline) {
                    done = true;
                }
            },
            nothing: () => {}
        });
        if(!done) {
            count += 1;
            iter.prev();
        } else {
            break;
        }
    }

    if(done) {
        return Maybe.just(count);
    } else {
        return Maybe.nothing();
    }
}

/**
 * @description Returns an iterator to previous newline if found. Otherwise returns Nothign.
 * @param source_iter - not modified
 */
function findPreviousNewline(source_iter: DoubleIterator<Glyph>): Maybe< DoubleIterator<Glyph> > {
    let iter = source_iter.clone();
    let found = false;
    while(iter.hasPrev() && !found) {
        iter.prev();
        iter.get().caseOf({
            just:(glyph) => {
                found = glyph.glyph === Strings.newline;
            },
            nothing: () => {}
        })
    }
    if(found) {
        return Maybe.just(iter);
    } else {
        return Maybe.nothing();
    }
}

function findNextLineOrLast(source_iter: DoubleIterator<Glyph>): DoubleIterator<Glyph> {
    let iter = source_iter.clone();
    let found = false;
    while(iter.hasNext() && !found) {
        iter.next();
        found = iter.get().caseOf({ 
            just: (glyph) => {
                return glyph.glyph === Strings.newline;
            },
            nothing: () => {
                return false;
            }
        });
    }

    // Now either we've found the next newline, or the end of the document. Either is fine.
    return iter;
}

function findLineEnd(source_iter: DoubleIterator<Glyph>): DoubleIterator<Glyph> {
    let iter = source_iter.clone();
    let found = false;
    while(iter.hasNext() && !found) {
        iter.next();
        found = iter.get().caseOf({ 
            just: (glyph) => {
                return glyph.glyph === Strings.newline;
            },
            nothing: () => {
                return false;
            }
        });
    }

    if(found) {
        // If we found the newline, we want the previous char.
        iter.prev();
    } else {
        // Otherwise the iterator is pointed at the last char in the list.
    } 

    return iter;
}


function moveArrow(key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>): Array< DoubleIterator<Glyph> > {
    let start = source_start_iter.clone();
    let end = source_end_iter.clone();
    switch(key) {
        case Strings.arrow.left: return arrowLeft(start, end);
        case Strings.arrow.right: return arrowRight(start, end);
        case Strings.arrow.up: return arrowUp(start, end);
        case Strings.arrow.down: return arrowDown(start, end);
        default: throw new Error("Invalid input to moveArrow: " + key); //return [start, end];
    }
}


function arrowLeft(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
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

function arrowRight(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
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

function arrowUp(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
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
        return arrowLeft(start_iter, end_iter);
    }
}

function arrowDown(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                            : Array< DoubleIterator<Glyph> > {
    let start_iter = source_start_iter.clone();
    let end_iter = source_end_iter.clone();

    if(start_iter.equals(end_iter)) {
        // find previous newline to determine distance from line start
        let final_iter = start_iter.clone();
        getDistanceFromLineStart(start_iter).caseOf({
            just: (distance) => {
                let line_end_iter = findLineEnd(start_iter);

                let foundNext = line_end_iter.hasNext();

                if(foundNext) {
                    // We found the next new line, or there was no next newline.
                    let tooFar = false;  // You go too far if you hit the next next line OR the EOF.
                    final_iter = line_end_iter.clone();
                    final_iter.next();
                    for(var i = 0; i < distance; i++) {
                        final_iter.next();
                        tooFar = final_iter.get().caseOf({
                            just: (glyph) => {
                                return !final_iter.isValid() || glyph.glyph === Strings.newline;
                            },
                            nothing: () => {
                                return !final_iter.isValid();
                            }
                        });

                        if(tooFar) {
                            break;
                        }
                    }
                    if(tooFar) {
                        final_iter.prev(); // back off from the newline OR the EOF if necessary.
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
        return arrowRight(source_start_iter, source_end_iter);
    }

}

function isArrowKey(key: string): boolean {
    let keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    for(let i = 0; i < keys.length; i++) {
        if(key === keys[i]) {
            return true;
        }
    }
    return false; 
}

function isChar(key: string): boolean {
    return key.length === 1;
}

function isSpace(key: string): boolean {
    return key === ' '
        || key === 'Tab'
        || key === 'Enter';
}

export {
    getDistanceFromNextLine,
    getDistanceFromLineStart,
    findPreviousNewline,
    findNextLineOrLast,
    findLineEnd,
    arrowLeft,
    arrowRight,
    arrowUp,
    arrowDown,
    isArrowKey,
    isChar,
    isSpace,
    moveArrow
};