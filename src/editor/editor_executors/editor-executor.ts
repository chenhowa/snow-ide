import { Glyph, GlyphStyle } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import { Renderer } from "editor/editor_executors/renderer";
import { DeleteRenderer } from "editor/editor_executors/deleter";


interface EditorExecutor {
    deleteAndRender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, direction: boolean)
                                                : Array< DoubleIterator<Glyph> >;
    insertAndRender(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>>;
    rerenderAt(iter: DoubleIterator<Glyph>): void;
    insertAndRerender(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>>;
    rerenderRange(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>): void;
}


class EditorActionExecutor implements EditorExecutor {
    renderer: Renderer;
    deleter: DeleteRenderer;

    constructor(renderer: Renderer, deleter: DeleteRenderer) {
        this.renderer = renderer;
        this.deleter = deleter;
    }

    rerenderRange(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                                                        : void {
        let start = source_start_iter.clone();
        let end = source_end_iter.clone();
        this.renderer.rerender(start, end);
    }

    rerenderAt(iter: DoubleIterator<Glyph>): void {
        return this.renderer.rerender(iter, iter);
    }

    insertAndRender(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>> {
        let new_iters: Array<DoubleIterator<Glyph>> = this._insertGlyph(char, source_start_iter, source_end_iter);
        this._renderGlyphs(new_iters[0], new_iters[1]);
        return new_iters;                             
    }

    /**
     * @description - inserts the char as a glyph, and updates iterator to point at the new glyph.
     *                Handles the case where start iterator and end iterator are not equal.
     *                // DOES NOT RENDER GLYPH.
     * @param char 
     * @param start_iter NOT MODIFIED
     * @param end_iter - NOT MODIFIED
     */
    _insertGlyph(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                                            : Array<DoubleIterator<Glyph>> {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();

        if(!start_iter.equals(end_iter)) {
            // If a selection, delete before inserting.
            // TODO : figure out direction parameter. It is not needed or used in deleting. Should it be?

            let new_iters = this._deleteGlyphsAndRerender(start_iter, end_iter, false);
            start_iter = new_iters[0];
            end_iter = new_iters[1];
        } 

        start_iter.insertAfter(new Glyph(char, new GlyphStyle()));
        start_iter.next();
        end_iter.next(); // keep end in sync with start.

        return [start_iter, end_iter];
        
    }

    /**
     * @desciption - Renders single glyph in DOM IGNORING the surrounding nodes.
     * @param source_start_iter - not modified. 
     * @param source_end_iter - not modified.
     */
    _renderGlyphs(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>) {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        this.renderer.render(start_iter, end_iter);
    }

    /**
     * @description - deletes the pointed at glyph and rerenders document
     * @param start_iter    NOT MODIFIED.
     * @param end_iter      NOT MODIFIED.
     * @param direction true if delete and move forward, else go backward.
     * @returns pair of iterators - first is new start iterator, second is new end iterator.
     */
    _deleteGlyphsAndRerender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, direction: boolean)
                                                                    : Array< DoubleIterator<Glyph> > {
        return this.deleter.deleteAndRender(start_iter.clone(), end_iter.clone(), direction);
    }

    deleteAndRender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, direction: boolean)
                                                : Array< DoubleIterator<Glyph> > {
        return this.deleter.deleteAndRender(start_iter.clone(), end_iter.clone(), direction);
    }

    insertAndRerender(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>> {
        let new_iters: Array<DoubleIterator<Glyph>> = this._insertGlyph(char, source_start_iter, source_end_iter);
        this.rerenderAt(new_iters[0]);
        return new_iters;
    }
}

export { EditorExecutor, EditorActionExecutor };