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
