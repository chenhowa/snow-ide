"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var string_map_1 = __importDefault(require("string-map"));
var jquery_1 = __importDefault(require("jquery"));
var MouseClickHandler = /** @class */ (function () {
    function MouseClickHandler(cursor, editor) {
        this.end_iter = tsmonad_1.Maybe.nothing();
        this.start_iter = tsmonad_1.Maybe.nothing();
        this.cursor = cursor;
        this.editor = editor;
    }
    /**
     * @todo 1. ENFORCE THAT EVENT PAIR IS DOWN FIRST, THEN UP.
     *       2. COMPARE SPANS WITH CURSOR SELECTION
     * @param eventPair Pair of events. First one is for the mousedown. The second is for the mouseup.
     * @param source_iter
     */
    MouseClickHandler.prototype.handle = function (eventPair, source_start_iter, source_end_iter) {
        console.log(eventPair);
        var downTarget = eventPair[0].target;
        var upTarget = eventPair[1].target;
        var iter = source_start_iter.clone();
        if (!this._inEditor(downTarget) || !this._inEditor(upTarget)) {
            // Return for now if either target is outside the editor. Later we may have to scroll up or down based on upTarget.
            return;
        }
        if (downTarget === upTarget) {
            // We clicked up and down on the same target.
            // But what the browser thinks we clicked is not nearly as accurate as what selection was made.
        }
        else {
            // If we didn't click up and down on the same target
            // We need to calculate selection. But this blows up when a selection is already made
        }
        var first_iter = this._getIterator(downTarget, iter);
        var first_distance = 0;
        first_iter.caseOf({
            just: function (iterator) {
                var it = iterator.clone();
                while (it.hasPrev()) {
                    it.prev();
                    first_distance += 1;
                }
            },
            nothing: function () { }
        });
        var second_iter = this._getIterator(upTarget, iter);
        var second_distance = 0;
        second_iter.caseOf({
            just: function (iterator) {
                var it = iterator.clone();
                while (it.hasPrev()) {
                    it.prev();
                    second_distance += 1;
                }
            },
            nothing: function () { }
        });
        // Set which is actually start and end by the distance to start of the document.
        if (first_distance <= second_distance) {
            //First is first
            console.log("FIRST");
            this.start_iter = first_iter;
            this.end_iter = second_iter;
        }
        else {
            // Second is first.
            console.log("SECOND");
            this.start_iter = second_iter;
            this.end_iter = second_iter;
        }
    };
    MouseClickHandler.prototype._inEditor = function (target) {
        if (target === this.editor) {
            return false;
        }
        return this.editor.contains(target);
    };
    MouseClickHandler.prototype._getIterator = function (node, source_iter) {
        var iter = source_iter.clone();
        if (node.nodeType === 3) {
            return this._handleTextNode(node, iter);
        }
        else if (jquery_1.default(node).hasClass(string_map_1.default.glyphName()) || jquery_1.default(node).hasClass(string_map_1.default.lineName())) {
            return this._handleStandardNode(node, iter);
        }
        else if (jquery_1.default(node).hasClass(string_map_1.default.editorName())) {
            // If this happens, let caller decide what to do with this.
            return tsmonad_1.Maybe.nothing();
        }
        else {
            throw new Error("Unhandled selection node in ClickHandler");
        }
    };
    MouseClickHandler.prototype._handleTextNode = function (node, source_iter) {
        //If text node, search for the span.
        var iter = source_iter.clone();
        var glyph = jquery_1.default(node).parents(string_map_1.default.glyphSelector()).first();
        var line = jquery_1.default(node).parents(string_map_1.default.lineSelector()).first();
        if (glyph.length > 0) {
            return this._handleStandardNode(glyph.get(0), iter);
        }
        else if (line.length > 0) {
            return this._handleStandardNode(line.get(0), iter);
        }
        else {
            return tsmonad_1.Maybe.nothing();
        }
    };
    MouseClickHandler.prototype._handleStandardNode = function (node, source_iter) {
        var iter = source_iter.clone();
        var found_iter = iter.findForward(function (glyph) {
            var match = false;
            glyph.getNode().caseOf({
                just: function (glyphNode) {
                    match = node === glyphNode;
                },
                nothing: function () { }
            });
            return match;
        });
        found_iter.prev();
        if (found_iter.isValid()) {
            // If we found the value, we can set the iterator to this one.
            return tsmonad_1.Maybe.just(found_iter);
        }
        else {
            return tsmonad_1.Maybe.nothing();
        }
    };
    MouseClickHandler.prototype.getStartIterator = function () {
        return this.start_iter;
    };
    MouseClickHandler.prototype.getEndIterator = function () {
        return this.end_iter;
    };
    return MouseClickHandler;
}());
exports.default = MouseClickHandler;
