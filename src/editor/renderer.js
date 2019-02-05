"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var string_map_1 = __importDefault(require("string-map"));
var jquery_1 = __importDefault(require("jquery"));
var EditorRenderer = /** @class */ (function () {
    function EditorRenderer() {
    }
    /**
     * @description Rerenders what iterator is pointing at. Useful for difficult to render things like newline insertions.
     * @param iter
     * @param editor
     */
    EditorRenderer.prototype.rerender = function (iter, editor) {
        var _this = this;
        iter.get().caseOf({
            just: function (glyph) {
                glyph.getNode().caseOf({
                    just: function (node) {
                        _this._rerenderNode(iter, node, editor);
                    },
                    nothing: function () {
                        _this._rerenderNode(iter, glyph.toNode(), editor);
                    }
                });
            },
            nothing: function () {
                // Nothing to rerender. So we do nothing.
            }
        });
    };
    EditorRenderer.prototype._rerenderNode = function (iter, node, editor) {
        var newNode = jquery_1.default(node);
        if (newNode.hasClass(string_map_1.default.lineName())) {
            this._rerenderLine(iter, editor);
        }
        else {
            // If we are not rerendering a newline, we will just destroy and rerender the node
            // through the this.render() method.
            this.render(iter, editor);
        }
    };
    /**
     *
     * @param iter // iterator pointing at the newline to rerender.
     * @param editor
     */
    EditorRenderer.prototype._rerenderLine = function (iter, editor) {
        // destroy rerendering newline, if it exists.
        iter.get().caseOf({
            just: function (glyph) {
                glyph.destroyNode();
            },
            nothing: function () {
            }
        });
        var back_iter = iter.clone();
        var foundPrevLine = false;
        while (back_iter.hasPrev() && !foundPrevLine) {
            back_iter.prev();
            back_iter.get().caseOf({
                just: function (glyph) {
                    glyph.getNode().caseOf({
                        just: function (node) {
                            foundPrevLine = jquery_1.default(node).hasClass(string_map_1.default.lineName());
                            glyph.destroyNode();
                        },
                        nothing: function () {
                            // Nothing to destroy. Do nothing.
                        }
                    });
                },
                nothing: function () {
                    // Nothing to rerender. Do nothing.
                }
            });
        }
        var forward_iter = iter.clone();
        var foundNextLine = false;
        while (forward_iter.hasNext() && !foundNextLine) {
            forward_iter.next();
            forward_iter.get().caseOf({
                just: function (glyph) {
                    glyph.getNode().caseOf({
                        just: function (node) {
                            foundNextLine = jquery_1.default(node).hasClass(string_map_1.default.lineName());
                        },
                        nothing: function () {
                            // Nothing to destroy. Do nothing.
                        }
                    });
                },
                nothing: function () {
                    // Nothing to destroy.
                }
            });
        }
        var end_iter = forward_iter.clone();
        if (foundNextLine) {
            end_iter.prev();
        }
        //Prepare to rerender.
        var rerender_iter = back_iter.clone();
        rerender_iter.prev();
        while (!rerender_iter.equals(forward_iter)) {
            rerender_iter.next();
            this.render(rerender_iter, editor);
        }
    };
    /**
     * @description Renders the node within the editor. Will destroy existing representations if they exist.
     * @param iter
     * @param editor
     */
    EditorRenderer.prototype.render = function (iter, editor) {
        var _this = this;
        iter.get().caseOf({
            just: function (glyph) {
                // We have something to render.
                glyph.destroyNode(); // Destroy old representation, if any.
                _this._renderNode(iter, glyph.toNode(), editor);
            },
            nothing: function () {
                // We have nothing to render. So we do nothing.
            }
        });
    };
    EditorRenderer.prototype._renderNode = function (iter, node, editor) {
        /* Where do we render it? And how? We decide based on the current
            character and the previous character. We have several cases:

            1. Current is newline. Then we insert after current line, or if that is not found, we insert as line at start of editor.
            2. Current is NOT newline. Then we insert in current line (after prev glyph), or if that is not found, we insert after previous glyph.
        */
        var newNode = jquery_1.default(node);
        if (newNode.hasClass(string_map_1.default.lineName())) {
            this._renderLine(iter, node, editor);
        }
        else if (newNode.hasClass(string_map_1.default.glyphName())) {
            this._renderGlyph(iter, node, editor);
        }
    };
    EditorRenderer.prototype._renderLine = function (iter, newline, editor) {
        //1. Current is newline. Then we insert after current line, or if that is not found, we assume editor is empty and append.
        var scan_iter = iter.clone();
        var found_valid_prev = false;
        while (scan_iter.hasPrev() && !found_valid_prev) {
            scan_iter.prev();
            scan_iter.get().caseOf({
                just: function (glyph) {
                    glyph.getNode().caseOf({
                        just: function (node) {
                            var prevNode = jquery_1.default(node);
                            var oldline;
                            if (prevNode.hasClass(string_map_1.default.lineName())) {
                                oldline = prevNode;
                            }
                            else {
                                oldline = jquery_1.default(node).parents(string_map_1.default.lineSelector()).first();
                            }
                            if (oldline.length > 0) {
                                //Found line. We will insert after this line.
                                found_valid_prev = true;
                                jquery_1.default(newline).insertAfter(oldline);
                            }
                        },
                        nothing: function () { }
                    });
                },
                nothing: function () { }
            });
        }
        if (!found_valid_prev) {
            // If the previous step did not succeed, we can only insert at start of editor.
            editor.appendChild(newline);
        }
    };
    EditorRenderer.prototype._renderGlyph = function (iter, new_glyph, editor) {
        //2. Current is NOT newline. Then we insert in current line (after prev glyph), or if that is not found, we insert after previous glyph.
        var scan_iter = iter.clone();
        var found_valid_prev = false;
        while (scan_iter.hasPrev() && !found_valid_prev) {
            scan_iter.prev();
            scan_iter.get().caseOf({
                just: function (glyph) {
                    glyph.getNode().caseOf({
                        just: function (node) {
                            var prevNode = jquery_1.default(node);
                            var old_glyph = prevNode.parents(string_map_1.default.glyphSelector()).first();
                            if (prevNode.hasClass(string_map_1.default.lineName())) {
                                // We found a line! Let's insert/append to it.
                                found_valid_prev = true;
                                var newline = prevNode.children(string_map_1.default.newlineSelector()).first();
                                if (newline.length > 0) {
                                    jquery_1.default(new_glyph).insertAfter(newline);
                                }
                                else {
                                    prevNode.get(0).appendChild(new_glyph);
                                }
                            }
                            else if (prevNode.hasClass(string_map_1.default.glyphName())) {
                                old_glyph = prevNode;
                            }
                            else {
                                old_glyph = prevNode.parents(string_map_1.default.glyphSelector()).first();
                            }
                            if (old_glyph.length > 0) {
                                //Found glyph. We will insert after this glyph
                                found_valid_prev = true;
                                jquery_1.default(new_glyph).insertAfter(old_glyph);
                            }
                        },
                        nothing: function () { }
                    });
                },
                nothing: function () { }
            });
        }
        if (!found_valid_prev) {
            // If the previous step did not succeed, we can only insert at start of editor.
            // REALLY WE SHOULD THROW AN EXCEPTION HERE AND RERENDER THE DOCUMENT.
            editor.appendChild(new_glyph);
        }
    };
    return EditorRenderer;
}());
exports.EditorRenderer = EditorRenderer;
