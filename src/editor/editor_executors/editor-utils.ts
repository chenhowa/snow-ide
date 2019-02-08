import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";
import Strings from "string-map";

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

export {
    getDistanceFromNextLine,
    getDistanceFromLineStart,
    findPreviousNewline,
    findNextLineOrLast,
    findLineEnd
};