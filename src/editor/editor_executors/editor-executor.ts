import { Glyph, GlyphStyle } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import { Renderer, EditorRenderer } from "editor/editor_executors/renderer";
import { DeleteRenderer, EditorDeleter } from "editor/editor_executors/deleter";

import HistorySingleton from "editor/singletons/history-singleton";
import { ChangeBuffer, ChangeTracker } from "editor/undo_redo/change-buffer";


import { AddCommand } from "editor/undo_redo/command-history";
import { SavePolicy, SaveData, EditorActionType, DeletionType } from "editor/undo_redo/policies/save-policies";
import SavePolicySingleton from "editor/singletons/save-policy-singleton";


interface EditorExecutor {
    deleteAndRender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, direction: boolean)
                                                : Array< DoubleIterator<Glyph> >;
    insertAndRender(char: string, source_start_iter: DoubleIterator<Glyph>, 
                                            source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>>;
    rerenderAt(iter: DoubleIterator<Glyph>): void;
    insertAndRerender(char: string, source_start_iter: DoubleIterator<Glyph>, 
                                            source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>>;
    rerenderRange(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>): void;
    renderAt(iter: DoubleIterator<Glyph>) : void;
}

class MockEditorExecutor implements EditorExecutor {
    constructor() {

    }

    deleteAndRender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, direction: boolean)
                                                : Array< DoubleIterator<Glyph> > {
                                                    
        return [start_iter.clone(), end_iter.clone()];
    }
    insertAndRender(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>> {
        return [source_start_iter.clone(), source_end_iter.clone()];
    }
    rerenderAt(iter: DoubleIterator<Glyph>): void {

    }
    insertAndRerender(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>> {
        return [source_start_iter.clone(), source_end_iter.clone()];
    }
    rerenderRange(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>): void {

    }

    renderAt(iter: DoubleIterator<Glyph>) {
        
    }
}


class EditorActionExecutor implements EditorExecutor {
    renderer: Renderer;
    deleter: DeleteRenderer;
    command_history: AddCommand<Glyph>; // we are only allowed to add commands to the history. No calling undo or redo!
    change_buffer: ChangeBuffer<Glyph> & ChangeTracker<Glyph>;
    save_policy: SavePolicy

    constructor(change_buffer: ChangeBuffer<Glyph> & ChangeTracker<Glyph>, editor: Node) {
        this.renderer = new EditorRenderer(editor);
        this.change_buffer = change_buffer;
        this.deleter = new EditorDeleter(this.renderer, this.change_buffer);

        this.save_policy = SavePolicySingleton.get(); // gets the save policy!
        this.command_history = HistorySingleton.get(); // always remember the history, so we can add to it as need be.
    }

    renderAt(iter: DoubleIterator<Glyph>) {
        this.renderer.render(iter.clone(), iter.clone());
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

            let new_iters = this.deleteAndRender(start_iter, end_iter, false);
            start_iter = new_iters[0];
            end_iter = new_iters[1];
        }

        // Now we reposition for the insert.
        let save_data = {
            char: char,
            editor_action: EditorActionType.Insert
        }
        this._repositionChangeBuffer(start_iter, end_iter, save_data);

        start_iter.insertAfter(new Glyph(char, new GlyphStyle()));
        start_iter.next();
        end_iter.next(); // keep end in sync with start.

        return [start_iter, end_iter];

        //f fdsssssssssssssssssssssss
        
    }

    _repositionChangeBuffer(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>, save_data: SaveData ): void {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();

        //First we check if we should save the latest insert/remove command at this point.
        if(this.save_policy.shouldSave(save_data) && this.change_buffer.isDirty()) {
            this.command_history.add(this.change_buffer.generateAndClean());
            this.save_policy.reset(); // Reset save_policies so 'unsave' until input then indicates again that we should save.
        }

        if(!this.change_buffer.isDirty()) {
            // If the change buffer isn't dirty, then we are starting a new change buffer due to this insert or deletion.
            // We also have to decide whether we want to collapse to the start or end anchor.
            let start_anchor = start_iter.clone();
            let end_anchor = end_iter.clone();
            end_anchor.next();
            this.change_buffer.setAnchors(start_anchor, end_anchor);

            if(save_data.deletion_direction && source_start_iter.equals(source_end_iter)) {
                // We only consider collapsing if we're backspacing or deleting a selection.
                if(save_data.deletion_direction === DeletionType.Backward) {
                    // Then we should collapse to the end, as the 'end' is the origin of the deletion.
                    this.change_buffer.collapseToEnd();
                } else {
                    this.change_buffer.collapseToStart();
                }
            } else {
                // No deletion direction was specified. Assume no collapsing is needed, and do nothing.
            }
        }
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
     * @param forward true if delete and move forward, else go backward.
     * @returns pair of iterators - first is new start iterator, second is new end iterator.
     */
    deleteAndRender(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>, forward: boolean)
                                                : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();

        if(start_iter.equals(end_iter)) {
            // We also check if we are doing an invalid backspace or delete. If we are, we definitely won't set anchors for the change buffer,
            // or do the deletion at all, really.
            let invalid = (!start_iter.hasPrev() && !forward) || (!end_iter.hasNext() && forward);
            if(invalid) {
                return [source_start_iter.clone(), source_end_iter.clone()];
            }
        }

        const save_data = {
            editor_action: EditorActionType.Remove,
            deletion_direction: forward ? DeletionType.Forward : DeletionType.Backward
        };
        this._repositionChangeBuffer(start_iter, end_iter, save_data);

        if(start_iter.equals(end_iter)) {
            // If we are deleting from a collapsed cursor, Backspace and Delete now  have a difference: one goes forward while the
            // Other goes backward.
            if(forward) {
                if(start_iter.hasNext()) {
                    start_iter.next();
                    end_iter.next();
                } else {
                    // If we try to "DELETE" at the EOF, we're in for trouble. So we don't even try.
                    return [source_start_iter.clone(), source_end_iter.clone()];
                }
            } else {
                // We need do nothing for backspace, as we are already set up for that.
            }
        } 

        return this.deleter.deleteAndRender(start_iter.clone(), end_iter.clone());
    }

    insertAndRerender(char: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                : Array<DoubleIterator<Glyph>> {
        let new_iters: Array<DoubleIterator<Glyph>> = this._insertGlyph(char, source_start_iter, source_end_iter);
        this.rerenderAt(new_iters[0]);
        return new_iters;
    }
}

export { EditorExecutor, EditorActionExecutor, MockEditorExecutor };