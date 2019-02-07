"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var string_map_1 = __importDefault(require("string-map"));
var jquery_1 = __importDefault(require("jquery"));
/*
    This class is for handling the state changes that occur after clicking.
    Can return the iterator in case the editor should also save the resultant iterator.
*/
var ClickHandler = /** @class */ (function () {
    function ClickHandler(cursor, editor) {
        this.end_iter = tsmonad_1.Maybe.nothing();
        this.start_iter = tsmonad_1.Maybe.nothing();
        this.cursor = cursor;
        this.editor = editor;
    }
    ClickHandler.prototype.handle = function (event, source_start_iter, source_end_iter) {
        console.log("CLICKED EDITOR");
        console.log(this.cursor.selection);
        console.log(event);
        console.log(event.target);
        var iter = source_start_iter.clone();
        if (this.cursor.selection.containsNode(this.editor, false)) {
            console.log("CONTAINS NODE");
            // If the entire editor is selected for some reason, do nothing except collapse to end iterator.
            this.end_iter = tsmonad_1.Maybe.just(iter.clone());
            this.start_iter = tsmonad_1.Maybe.just(iter.clone());
            return;
        }
        /* In click handler, set the position of the iterator according to
           where the cursor is now located. Three possibilities of where the cursor now is:
            1. in a text node.
            2. in a glyph span node.
            3. In a line div node.
            4. in the editor node.
        */
        if (this.cursor.isCollapsed()) {
            console.log("COLLAPSED");
            var node = this.cursor.selection.anchorNode;
            var before = this.cursor.selection.anchorOffset === 0;
            this.start_iter = this._getIterator(node, before, iter);
            this.end_iter = this._getIterator(node, before, iter);
        }
        else {
            console.log("SPREAD OUT");
            // If the selection is NOT collapsed and is entirely within the editor, we can try to set the start and end iterators.
            var start_node = this.cursor.selection.anchorNode;
            var before_start = this.cursor.selection.anchorOffset === 0;
            var start_iter = this._getIterator(start_node, before_start, iter);
            var first_distance_1 = 0;
            start_iter.caseOf({
                just: function (iterator) {
                    var it = iterator.clone();
                    while (it.hasPrev()) {
                        it.prev();
                        first_distance_1 += 1;
                    }
                },
                nothing: function () { }
            });
            var end_node = this.cursor.selection.focusNode;
            var before_end = this.cursor.selection.focusOffset === 0;
            var end_iter = this._getIterator(end_node, before_end, iter);
            var second_distance_1 = 0;
            end_iter.caseOf({
                just: function (iterator) {
                    var it = iterator.clone();
                    while (it.hasPrev()) {
                        it.prev();
                        second_distance_1 += 1;
                    }
                },
                nothing: function () { }
            });
            // Set which is actually start and end by the distance to start of the document.
            if (first_distance_1 <= second_distance_1) {
                //First is first
                console.log("FIRST");
                this.start_iter = start_iter;
                this.end_iter = end_iter;
            }
            else {
                // Second is first.
                console.log("SECOND");
                this.start_iter = end_iter;
                this.end_iter = start_iter;
            }
        }
        event.preventDefault();
    };
    ClickHandler.prototype._getIterator = function (node, before, source_iter) {
        var iter = source_iter.clone();
        if (node.nodeType === 3) {
            return this._handleTextNode(node, iter, before);
        }
        else if (jquery_1.default(node).hasClass(string_map_1.default.glyphName()) || jquery_1.default(node).hasClass(string_map_1.default.lineName())) {
            return this._handleStandardNode(node, iter, before);
        }
        else if (jquery_1.default(node).hasClass(string_map_1.default.editorName())) {
            // If this happens, let caller decide what to do with this.
            return tsmonad_1.Maybe.nothing();
        }
        else {
            throw new Error("Unhandled selection node in ClickHandler");
        }
    };
    ClickHandler.prototype._handleTextNode = function (node, source_iter, before) {
        //If text node, search for the span.
        var iter = source_iter.clone();
        var glyph = jquery_1.default(node).parents(string_map_1.default.glyphSelector()).first();
        var line = jquery_1.default(node).parents(string_map_1.default.lineSelector()).first();
        if (glyph.length > 0) {
            return this._handleStandardNode(glyph.get(0), iter, before);
        }
        else if (line.length > 0) {
            return this._handleStandardNode(line.get(0), iter, before);
        }
        else {
            return tsmonad_1.Maybe.nothing();
        }
    };
    ClickHandler.prototype._handleStandardNode = function (node, source_iter, before) {
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
        if (found_iter.isValid()) {
            if (before && found_iter.hasPrev()) {
                found_iter.prev();
            }
            // If we found the value, we can set the iterator to this one.
            return tsmonad_1.Maybe.just(found_iter);
        }
        else {
            return tsmonad_1.Maybe.nothing();
        }
    };
    ClickHandler.prototype.getStartIterator = function () {
        return this.start_iter;
    };
    ClickHandler.prototype.getEndIterator = function () {
        return this.end_iter;
    };
    return ClickHandler;
}());
exports.default = ClickHandler;
