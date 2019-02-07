"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var string_map_1 = __importDefault(require("string-map"));
var jquery_1 = __importDefault(require("jquery"));
var editor_utils_1 = require("editor/editor-utils");
var EditorRenderer = /** @class */ (function () {
    function EditorRenderer() {
    }
    /**
     * @description Rerenders what iterator is pointing at. Useful for difficult to render things like
     *              newline insertions.
     * @param source_start_iter  - Not modified
     * @param source_end_iter - Not modified
     * @param editor  - Modified.
     */
    EditorRenderer.prototype.rerender = function (source_start_iter, source_end_iter, editor) {
        var _this = this;
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (start_iter.equals(end_iter)) {
            start_iter.get().caseOf({
                just: function (glyph) {
                    glyph.getNode().caseOf({
                        just: function (node) {
                            _this._rerenderNode(start_iter, node, editor);
                        },
                        nothing: function () {
                            _this._rerenderNode(start_iter, glyph.toNode(), editor);
                        }
                    });
                },
                nothing: function () {
                    // Nothing to rerender. So we do nothing.
                }
            });
        }
        else {
            // TODO : How to rerender the set of nodes contained within two start and end iterators?
            // ANSWER. - from start node + 1, find soonest previous newline (inclusive).
            //         - from end node, from next newline (or EOF).
            //      Then rerender starting from the previous newline to ONE BEFORE the next newline
            start_iter.next();
            var prev_line_iter_1 = editor_utils_1.findPreviousNewline(start_iter).caseOf({
                just: function (iter) {
                    return iter;
                },
                nothing: function () {
                    return start_iter.clone();
                }
            });
            var end_of_line_iter = editor_utils_1.findLineEnd(end_iter);
            while (prev_line_iter_1.isValid()) {
                prev_line_iter_1.get().caseOf({
                    just: function (glyph) {
                        _this.render(prev_line_iter_1, prev_line_iter_1, editor);
                    },
                    nothing: function () {
                        // Nothing to render.
                    }
                });
                if (prev_line_iter_1.equals(end_of_line_iter)) {
                    // If we've rendered up to the end of line, we're done.
                    break;
                }
                else {
                    // Otherwise continue trying rendering.
                    prev_line_iter_1.next();
                }
            }
        }
    };
    EditorRenderer.prototype._rerenderNode = function (iter, node, editor) {
        var newNode = jquery_1.default(node);
        if (newNode.hasClass(string_map_1.default.lineName())) {
            this._rerenderLine(iter, editor);
        }
        else {
            // If we are not rerendering a newline, we will just destroy and rerender the node
            // through the this.render() method.
            this.render(iter, iter, editor);
        }
    };
    /**
     *
     * @param iter // iterator pointing at the newline to rerender.
     * @param editor
     */
    EditorRenderer.prototype._rerenderLine = function (source_iter, editor) {
        var iter = source_iter.clone();
        // destroy rerendering newline, if it exists.
        iter.get().caseOf({
            just: function (glyph) {
                glyph.destroyNode();
            },
            nothing: function () {
            }
        });
        var prev_line_iter = editor_utils_1.findPreviousNewline(iter).caseOf({
            just: function (prev) {
                return prev;
            },
            nothing: function () {
                return iter.clone();
            }
        });
        var line_end_iter = editor_utils_1.findLineEnd(iter);
        while (prev_line_iter.isValid()) {
            this.render(prev_line_iter, prev_line_iter, editor);
            if (prev_line_iter.equals(line_end_iter)) {
                break;
            }
            else {
                prev_line_iter.next();
            }
        }
    };
    /**
     * @description Renders the node within the editor. Will destroy existing representations if they exist.
     *              Meant for rendering SINGLE NODES, regardless of surrounding context.
     *              Will not correctly render newly inserted newlines, for exaple.
     *              Use rerender instead.
     * @param start_iter - Not modified.
     * @param end_iter - Not modified.
     * @param editor - modified.
     */
    EditorRenderer.prototype.render = function (source_start_iter, source_end_iter, editor) {
        var _this = this;
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (start_iter.equals(end_iter)) {
            start_iter.get().caseOf({
                just: function (glyph) {
                    // We have something to render.
                    glyph.destroyNode(); // Destroy old representation, if any.
                    _this._renderNode(start_iter, glyph.toNode(), editor);
                },
                nothing: function () {
                    // We have nothing to render. So we do nothing.
                }
            });
        }
        else {
            // Render everything to the RIGHT of the start_iter,
            // up to but NOT PAST the end_iter.
            while (start_iter.hasNext()) {
                start_iter.next();
                start_iter.get().caseOf({
                    just: function (glyph) {
                        glyph.destroyNode(),
                            _this._renderNode(start_iter, glyph.toNode(), editor);
                    },
                    nothing: function () {
                        // We have nothing to render. So we do nothing.
                    }
                });
                if (start_iter.equals(end_iter)) {
                    break;
                }
            }
        }
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
                            else {
                                console.log('did not find valid oldline');
                            }
                        },
                        nothing: function () {
                            console.log("no node to render. What do?");
                        }
                    });
                },
                nothing: function () { }
            });
        }
        if (!found_valid_prev) {
            // If the previous step did not succeed, we can only insert at start of editor.
            var firstLine = jquery_1.default(editor).children(string_map_1.default.lineSelector()).first();
            if (firstLine.length > 0) {
                jquery_1.default(newline).insertBefore(firstLine);
            }
            else {
                editor.appendChild(newline);
            }
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
                        nothing: function () {
                            console.log("No glyph to render. What do?");
                        }
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
