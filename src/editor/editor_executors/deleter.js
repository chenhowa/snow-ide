"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var glyph_1 = require("editor/glyph");
var string_map_1 = __importDefault(require("string-map"));
var EditorDeleter = /** @class */ (function () {
    function EditorDeleter(renderer) {
        this.renderer = renderer;
    }
    EditorDeleter.prototype.deleteAndRender = function (source_start_iter, source_end_iter, direction) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        // First we remove and destroy nodes until start_iter equals end_iter.
        // then we remove the node at start_iter == end_iter, and move
        // in the correct direction. Then we rerender.
        while (!start_iter.equals(end_iter) && start_iter.hasNext()) {
            start_iter.next();
            if (start_iter.equals(end_iter)) {
                break;
            }
            else {
                start_iter.get().caseOf({
                    just: function (glyph) {
                        glyph.destroyNode();
                    },
                    nothing: function () { }
                });
                start_iter.remove(false);
            }
        }
        // At this point, start_iter == end_iter. We delete the last glyph that needs to be deleted.
        start_iter.get().caseOf({
            just: function (glyph) {
                glyph.destroyNode();
            },
            nothing: function () { }
        });
        start_iter.remove(false);
        // If we need to, we insert a newline before rerendering (we might have deleted
        // the initial newline in the document)
        if (!start_iter.isValid()) {
            // If not valid, we are at the front sentinel of the linked list.
            var next_iter = start_iter.clone();
            next_iter.next();
            var shouldInsert = next_iter.get().caseOf({
                just: function (glyph) {
                    return !(glyph.glyph === string_map_1.default.newline);
                },
                nothing: function () {
                    return true;
                }
            });
            if (shouldInsert) {
                start_iter.insertAfter(new glyph_1.Glyph(string_map_1.default.newline, new glyph_1.GlyphStyle()));
                start_iter.next();
            }
        }
        // Now we rerender.
        end_iter = start_iter.clone(); // restore the validity of end_iter.
        this.renderer.rerender(start_iter, end_iter);
        return [start_iter.clone(), end_iter.clone()];
    };
    return EditorDeleter;
}());
exports.EditorDeleter = EditorDeleter;
