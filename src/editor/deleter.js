"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var glyph_1 = require("editor/glyph");
var string_map_1 = __importDefault(require("string-map"));
var jquery_1 = __importDefault(require("jquery"));
var EditorDeleter = /** @class */ (function () {
    function EditorDeleter(renderer) {
        this.renderer = renderer;
    }
    EditorDeleter.prototype.deleteAndRender = function (source_iter, editor, direction) {
        var _this = this;
        var iter = source_iter.clone();
        var return_iter = iter.get().caseOf({
            just: function (glyph) {
                return glyph.getNode().caseOf({
                    just: function (node) {
                        return _this._deleteGlyphAndRerender(iter, node, editor, direction);
                    },
                    nothing: function () {
                        // If node was not rendered, nothing to do but remove the cell.
                        iter.remove(direction);
                        return iter.clone();
                    }
                });
            },
            nothing: function () {
                // The cell is empty. Might as well delete it.
                iter.remove(direction);
                return iter.clone();
            }
        });
        return return_iter;
    };
    EditorDeleter.prototype._deleteGlyphAndRerender = function (source_iter, node, editor, direction) {
        var deadNode = jquery_1.default(node);
        var isLine = deadNode.hasClass(string_map_1.default.lineName());
        var isGlyph = deadNode.hasClass(string_map_1.default.glyphName());
        var iter = source_iter.clone();
        // Get rid of node from screen and from list.
        deadNode.remove();
        iter.remove(direction);
        // Rerender document parts that require it.
        if (isLine) {
            // If we are deleting a line, we derender everything in this line and previous line, and then rerender
            // previous line and remainder of this line.
            var deleteIterator_1 = iter.clone();
            if (direction) {
                // If we went forward, we need to adjust for algorithm by backing up one.
                deleteIterator_1.prev();
            }
            var foundNextLine_1 = false;
            while (deleteIterator_1.hasNext() && !foundNextLine_1) {
                deleteIterator_1.next();
                deleteIterator_1.get().caseOf({
                    just: function (glyph) {
                        glyph.getNode().caseOf({
                            just: function (node) {
                                if (jquery_1.default(node).hasClass(string_map_1.default.lineName())) {
                                    foundNextLine_1 = true;
                                }
                                else {
                                    glyph.destroyNode();
                                }
                            },
                            nothing: function () {
                                // If node was empty, nothing to destroy.
                            }
                        });
                    },
                    nothing: function () {
                        // If the cell was empty, just remove it.
                        deleteIterator_1.remove(false);
                    }
                });
            }
            var endIterator = deleteIterator_1.clone(); // This marks the stopping point of the rerendering later.
            if (foundNextLine_1) {
                endIterator.prev(); // We don't want to rerender the new line, so we back up one.
            }
            // Then we go backward and derender the entire previous line.
            var foundPrevLine_1 = false;
            while (deleteIterator_1.hasPrev() && !foundPrevLine_1) {
                deleteIterator_1.prev();
                deleteIterator_1.get().caseOf({
                    just: function (glyph) {
                        glyph.getNode().caseOf({
                            just: function (node) {
                                if (jquery_1.default(node).hasClass(string_map_1.default.lineName())) {
                                    glyph.destroyNode();
                                    foundPrevLine_1 = true;
                                }
                                else {
                                    glyph.destroyNode();
                                }
                            },
                            nothing: function () {
                            }
                        });
                    },
                    nothing: function () {
                        deleteIterator_1.remove(true);
                    }
                });
            }
            // Now we rerender 
            var renderIterator = deleteIterator_1.clone();
            renderIterator.prev();
            if (!foundPrevLine_1) {
                // We MUST have a newline at start for document rendering to work correctly.
                renderIterator.insertAfter(new glyph_1.Glyph("\n", new glyph_1.GlyphStyle()));
            }
            while (!renderIterator.equals(endIterator)) {
                renderIterator.next();
                this.renderer.render(renderIterator, editor);
            }
        }
        else if (isGlyph) {
            // No need to do anything. Deleted glyph and removed rendered node earlier.
        }
        else {
            throw new Error("Unhandled node being deleted");
        }
        return iter.clone();
    };
    return EditorDeleter;
}());
exports.EditorDeleter = EditorDeleter;
