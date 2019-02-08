"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var string_map_1 = __importDefault(require("string-map"));
/**
 * @description Count forwards to find distance to next newline character, MINUS 1
 *              If at line start, returns 0. If no next newline character, returns Nothing.
 * @returns     Nonnegative number.
 */
function getDistanceFromNextLine(source_iter) {
    var iter = source_iter.clone();
    var count = 0;
    var done = false;
    while (iter.hasNext() && !done) {
        iter.next();
        iter.get().caseOf({
            just: function (glyph) {
                if (glyph.glyph === string_map_1.default.newline) {
                    done = true;
                }
                else {
                    count += 1;
                }
            },
            nothing: function () { }
        });
    }
    if (done) {
        return count + 1;
    }
    else {
        return count + 1;
    }
}
exports.getDistanceFromNextLine = getDistanceFromNextLine;
/**
 * @description Count backwards to find distance from new line. If at line start
 *              returns 0. If no line start, return Nothing.
 * @returns Maybe<nonegative number>
 */
function getDistanceFromLineStart(source_iter) {
    var iter = source_iter.clone();
    var count = 0;
    var done = false;
    while (iter.isValid() && !done) {
        iter.get().caseOf({
            just: function (glyph) {
                if (glyph.glyph === string_map_1.default.newline) {
                    done = true;
                }
            },
            nothing: function () { }
        });
        if (!done) {
            count += 1;
            iter.prev();
        }
        else {
            break;
        }
    }
    if (done) {
        return tsmonad_1.Maybe.just(count);
    }
    else {
        return tsmonad_1.Maybe.nothing();
    }
}
exports.getDistanceFromLineStart = getDistanceFromLineStart;
/**
 * @description Returns an iterator to previous newline if found. Otherwise returns Nothign.
 * @param source_iter - not modified
 */
function findPreviousNewline(source_iter) {
    var iter = source_iter.clone();
    var found = false;
    while (iter.hasPrev() && !found) {
        iter.prev();
        iter.get().caseOf({
            just: function (glyph) {
                found = glyph.glyph === string_map_1.default.newline;
            },
            nothing: function () { }
        });
    }
    if (found) {
        return tsmonad_1.Maybe.just(iter);
    }
    else {
        return tsmonad_1.Maybe.nothing();
    }
}
exports.findPreviousNewline = findPreviousNewline;
function findNextLineOrLast(source_iter) {
    var iter = source_iter.clone();
    var found = false;
    while (iter.hasNext() && !found) {
        iter.next();
        found = iter.get().caseOf({
            just: function (glyph) {
                return glyph.glyph === string_map_1.default.newline;
            },
            nothing: function () {
                return false;
            }
        });
    }
    // Now either we've found the next newline, or the end of the document. Either is fine.
    return iter;
}
exports.findNextLineOrLast = findNextLineOrLast;
function findLineEnd(source_iter) {
    var iter = source_iter.clone();
    var found = false;
    while (iter.hasNext() && !found) {
        iter.next();
        found = iter.get().caseOf({
            just: function (glyph) {
                return glyph.glyph === string_map_1.default.newline;
            },
            nothing: function () {
                return false;
            }
        });
    }
    if (found) {
        // If we found the newline, we want the previous char.
        iter.prev();
    }
    else {
        // Otherwise the iterator is pointed at the last char in the list.
    }
    return iter;
}
exports.findLineEnd = findLineEnd;
function arrowLeft(source_start_iter, source_end_iter) {
    var start_iter = source_start_iter.clone();
    var end_iter = source_end_iter.clone();
    if (start_iter.equals(end_iter)) {
        // Back both up by one if possible.
        if (start_iter.hasPrev()) {
            start_iter.prev();
            end_iter = start_iter.clone();
        }
    }
    else {
        // If selection, collapse end into start (left).
        end_iter = start_iter.clone();
    }
    return [start_iter.clone(), end_iter.clone()];
}
exports.arrowLeft = arrowLeft;
function arrowRight(source_start_iter, source_end_iter) {
    var start_iter = source_start_iter.clone();
    var end_iter = source_end_iter.clone();
    if (start_iter.equals(end_iter)) {
        if (start_iter.hasNext()) {
            start_iter.next();
            end_iter = start_iter.clone();
        }
    }
    else {
        // If selection, collapse start into end (right)
        start_iter = end_iter.clone();
    }
    return [start_iter.clone(), end_iter.clone()];
}
exports.arrowRight = arrowRight;
function arrowUp(source_start_iter, source_end_iter) {
    var start_iter = source_start_iter.clone();
    var end_iter = source_end_iter.clone();
    if (start_iter.equals(end_iter)) {
        var final_iter_1 = start_iter.clone();
        getDistanceFromLineStart(start_iter).caseOf({
            just: function (distance) {
                var move = false;
                if (distance === 0) {
                    findPreviousNewline(start_iter).caseOf({
                        just: function (new_iter) {
                            final_iter_1 = new_iter;
                        },
                        nothing: function () { }
                    });
                }
                else {
                    findPreviousNewline(start_iter).caseOf({
                        just: function (new_iter) {
                            findPreviousNewline(new_iter).caseOf({
                                just: function (new_iter) {
                                    final_iter_1 = new_iter;
                                    move = true;
                                },
                                nothing: function () {
                                }
                            });
                        },
                        nothing: function () { }
                    });
                    if (move) {
                        for (var i = 0; i < distance; i++) {
                            final_iter_1.next();
                            var done = final_iter_1.get().caseOf({
                                just: function (glyph) {
                                    if (glyph.glyph === string_map_1.default.newline) {
                                        // If found newline, back up one.
                                        final_iter_1.prev();
                                        return true;
                                    }
                                },
                                nothing: function () {
                                    return false;
                                }
                            });
                            if (done) {
                                break;
                            }
                        }
                    }
                }
            },
            nothing: function () {
                throw new Error("Document did not start with a line!");
            }
        });
        return [final_iter_1.clone(), final_iter_1.clone()];
    }
    else {
        // If selection, up will just go left.
        return arrowLeft(start_iter, end_iter);
    }
}
exports.arrowUp = arrowUp;
function arrowDown(source_start_iter, source_end_iter) {
    var start_iter = source_start_iter.clone();
    var end_iter = source_end_iter.clone();
    if (start_iter.equals(end_iter)) {
        // find previous newline to determine distance from line start
        var final_iter_2 = start_iter.clone();
        getDistanceFromLineStart(start_iter).caseOf({
            just: function (distance) {
                var line_end_iter = findLineEnd(start_iter);
                var foundNext = line_end_iter.hasNext();
                if (foundNext) {
                    // We found the next new line, or there was no next newline.
                    var tooFar = false; // You go too far if you hit the next next line OR the EOF.
                    final_iter_2 = line_end_iter.clone();
                    final_iter_2.next();
                    for (var i = 0; i < distance; i++) {
                        final_iter_2.next();
                        tooFar = final_iter_2.get().caseOf({
                            just: function (glyph) {
                                return !final_iter_2.isValid() || glyph.glyph === string_map_1.default.newline;
                            },
                            nothing: function () {
                                return !final_iter_2.isValid();
                            }
                        });
                        if (tooFar) {
                            break;
                        }
                    }
                    if (tooFar) {
                        final_iter_2.prev(); // back off from the newline OR the EOF if necessary.
                    }
                }
                else {
                    // If no next line, we don't move.
                }
            },
            nothing: function () {
                throw new Error("doc does not start with newline");
            }
        });
        return [final_iter_2.clone(), final_iter_2.clone()];
    }
    else {
        // If selection, will just go right.
        return arrowRight(source_start_iter, source_end_iter);
    }
}
exports.arrowDown = arrowDown;
