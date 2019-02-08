"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var glyph_1 = require("editor/glyph");
var MockEditorExecutor = /** @class */ (function () {
    function MockEditorExecutor() {
    }
    MockEditorExecutor.prototype.deleteAndRender = function (start_iter, end_iter, direction) {
        return [start_iter.clone(), end_iter.clone()];
    };
    MockEditorExecutor.prototype.insertAndRender = function (char, source_start_iter, source_end_iter) {
        return [source_start_iter.clone(), source_end_iter.clone()];
    };
    MockEditorExecutor.prototype.rerenderAt = function (iter) {
    };
    MockEditorExecutor.prototype.insertAndRerender = function (char, source_start_iter, source_end_iter) {
        return [source_start_iter.clone(), source_end_iter.clone()];
    };
    MockEditorExecutor.prototype.rerenderRange = function (start, end) {
    };
    return MockEditorExecutor;
}());
exports.MockEditorExecutor = MockEditorExecutor;
var EditorActionExecutor = /** @class */ (function () {
    function EditorActionExecutor(renderer, deleter) {
        this.renderer = renderer;
        this.deleter = deleter;
    }
    EditorActionExecutor.prototype.rerenderRange = function (source_start_iter, source_end_iter) {
        var start = source_start_iter.clone();
        var end = source_end_iter.clone();
        this.renderer.rerender(start, end);
    };
    EditorActionExecutor.prototype.rerenderAt = function (iter) {
        return this.renderer.rerender(iter, iter);
    };
    EditorActionExecutor.prototype.insertAndRender = function (char, source_start_iter, source_end_iter) {
        var new_iters = this._insertGlyph(char, source_start_iter, source_end_iter);
        this._renderGlyphs(new_iters[0], new_iters[1]);
        return new_iters;
    };
    /**
     * @description - inserts the char as a glyph, and updates iterator to point at the new glyph.
     *                Handles the case where start iterator and end iterator are not equal.
     *                // DOES NOT RENDER GLYPH.
     * @param char
     * @param start_iter NOT MODIFIED
     * @param end_iter - NOT MODIFIED
     */
    EditorActionExecutor.prototype._insertGlyph = function (char, source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        if (!start_iter.equals(end_iter)) {
            // If a selection, delete before inserting.
            // TODO : figure out direction parameter. It is not needed or used in deleting. Should it be?
            var new_iters = this._deleteGlyphsAndRerender(start_iter, end_iter, false);
            start_iter = new_iters[0];
            end_iter = new_iters[1];
        }
        start_iter.insertAfter(new glyph_1.Glyph(char, new glyph_1.GlyphStyle()));
        start_iter.next();
        end_iter.next(); // keep end in sync with start.
        return [start_iter, end_iter];
    };
    /**
     * @desciption - Renders single glyph in DOM IGNORING the surrounding nodes.
     * @param source_start_iter - not modified.
     * @param source_end_iter - not modified.
     */
    EditorActionExecutor.prototype._renderGlyphs = function (source_start_iter, source_end_iter) {
        var start_iter = source_start_iter.clone();
        var end_iter = source_end_iter.clone();
        this.renderer.render(start_iter, end_iter);
    };
    /**
     * @description - deletes the pointed at glyph and rerenders document
     * @param start_iter    NOT MODIFIED.
     * @param end_iter      NOT MODIFIED.
     * @param direction true if delete and move forward, else go backward.
     * @returns pair of iterators - first is new start iterator, second is new end iterator.
     */
    EditorActionExecutor.prototype._deleteGlyphsAndRerender = function (start_iter, end_iter, direction) {
        return this.deleter.deleteAndRender(start_iter.clone(), end_iter.clone(), direction);
    };
    EditorActionExecutor.prototype.deleteAndRender = function (start_iter, end_iter, direction) {
        return this.deleter.deleteAndRender(start_iter.clone(), end_iter.clone(), direction);
    };
    EditorActionExecutor.prototype.insertAndRerender = function (char, source_start_iter, source_end_iter) {
        var new_iters = this._insertGlyph(char, source_start_iter, source_end_iter);
        this.rerenderAt(new_iters[0]);
        return new_iters;
    };
    return EditorActionExecutor;
}());
exports.EditorActionExecutor = EditorActionExecutor;
