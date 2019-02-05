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
    function ClickHandler(cursor) {
        this.iterator = tsmonad_1.Maybe.nothing();
        this.cursor = cursor;
    }
    ClickHandler.prototype.handle = function (event, iter) {
        console.log(event);
        console.log(this.cursor.selection);
        /* In click handler, set the position of the iterator according to
           where the cursor is now located. Three possibilities of where the cursor now is:
            1. in a text node.
            2. in a glyph span node.
            3. In a line div node.
            4. in the editor node.
        */
        if (this.cursor.isCollapsed()) {
            var node = this.cursor.selection.anchorNode;
            var offset = this.cursor.selection.anchorOffset;
            if (node.nodeType === 3) {
                console.log("text node");
                this._handleTextNode(node, iter);
            }
            else if (jquery_1.default(node).hasClass(string_map_1.default.glyphName()) || jquery_1.default(node).hasClass(string_map_1.default.lineName())) {
                console.log("standard node");
                this._handleStandardNode(node, iter);
            }
            else if (jquery_1.default(node).hasClass(string_map_1.default.editorName())) {
                // If this happens, let caller decide what to do with this.
                console.log("else 2");
                this.iterator = tsmonad_1.Maybe.nothing();
            }
            else {
                throw new Error("Unhandled selection node in ClickHandler");
            }
        }
        else {
            console.log("else 1");
            this.iterator = tsmonad_1.Maybe.nothing();
        }
    };
    ClickHandler.prototype._handleTextNode = function (node, iter) {
        //If text node, search for the span.
        var glyph = jquery_1.default(node).parents(string_map_1.default.glyphSelector()).first();
        var line = jquery_1.default(node).parents(string_map_1.default.lineSelector()).first();
        var targetNode = glyph.get(0);
        if (glyph.length > 0) {
            console.log("text glyph");
            this._handleStandardNode(glyph.get(0), iter);
        }
        else if (line.length > 0) {
            console.log("text line");
            this._handleStandardNode(line.get(0), iter);
        }
        else {
            console.log("text not found");
            this.iterator = tsmonad_1.Maybe.nothing();
        }
    };
    ClickHandler.prototype._handleStandardNode = function (node, iter) {
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
            console.log("found");
            // If we found the value, we can set the iterator to this one.
            this.iterator = tsmonad_1.Maybe.just(found_iter);
        }
        else {
            console.log("not found");
            this.iterator = tsmonad_1.Maybe.nothing();
        }
    };
    ClickHandler.prototype.getNewIterators = function () {
        return this.iterator;
    };
    return ClickHandler;
}());
exports.default = ClickHandler;
