


import Handler from "editor/handlers/handler";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph, ToNode } from "editor/glyph";
import { Maybe } from "tsmonad";
import Cursor from "editor/cursor";
import Strings from "string-map";
import $ from "jquery";

/*
    This class is for handling the state changes that occur after clicking.
    Can return the iterator in case the editor should also save the resultant iterator.
*/
class ClickHandler implements Handler {
    end_iter: Maybe< DoubleIterator<Glyph> > = Maybe.nothing();
    start_iter: Maybe< DoubleIterator<Glyph> > = Maybe.nothing();
    cursor: Cursor;
    editor: Node;
    constructor(cursor: Cursor, editor: Node) {
        this.cursor = cursor;
        this.editor = editor;
    }

    handle(event: any, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>) {
        console.log("CLICKED EDITOR");
        console.log(this.cursor.selection);
        console.log(event);
        console.log(event.target);
        let iter = source_start_iter.clone();

        if(this.cursor.selection.containsNode(this.editor, false)) {
            console.log("CONTAINS NODE");
            // If the entire editor is selected for some reason, do nothing except collapse to end iterator.
            this.end_iter = Maybe.just(iter.clone() );
            this.start_iter = Maybe.just(iter.clone());
            return;
        }

        /* In click handler, set the position of the iterator according to 
           where the cursor is now located. Three possibilities of where the cursor now is:
            1. in a text node.
            2. in a glyph span node.
            3. In a line div node.
            4. in the editor node.
        */
        if(this.cursor.isCollapsed()) {
            console.log("COLLAPSED");
            let node = this.cursor.selection.anchorNode;
            let before = this.cursor.selection.anchorOffset === 0;

            this.start_iter = this._getIterator(node, before, iter);
            this.end_iter = this._getIterator(node, before, iter);
        } else {
            console.log("SPREAD OUT");

            // If the selection is NOT collapsed and is entirely within the editor, we can try to set the start and end iterators.
            let start_node = this.cursor.selection.anchorNode;
            let before_start = this.cursor.selection.anchorOffset === 0;
            let start_iter = this._getIterator(start_node, before_start, iter);
            let first_distance = 0;
            start_iter.caseOf({
                just: (iterator) => {
                    let it = iterator.clone();
                    while(it.hasPrev()) {
                        it.prev();
                        first_distance += 1;
                    }
                },
                nothing: () => {}
            });

            let end_node = this.cursor.selection.focusNode;
            let before_end = this.cursor.selection.focusOffset === 0;
            let end_iter = this._getIterator(end_node, before_end, iter);
            let second_distance = 0;
            end_iter.caseOf({
                just: (iterator) => {
                    let it = iterator.clone();
                    while(it.hasPrev()) {
                        it.prev();
                        second_distance += 1;
                    }
                },
                nothing: () => {}
            });

            // Set which is actually start and end by the distance to start of the document.
            if(first_distance <= second_distance) {
                //First is first
                console.log("FIRST");
                this.start_iter = start_iter;
                this.end_iter = end_iter;
            } else {
                // Second is first.
                console.log("SECOND");
                this.start_iter = end_iter;
                this.end_iter = start_iter;
            }

        }

        event.preventDefault();
    }

    _getIterator(node: Node, before: boolean, source_iter: DoubleIterator<Glyph>): Maybe< DoubleIterator<Glyph> > {
        let iter = source_iter.clone();
        if(node.nodeType === 3) {
            return this._handleTextNode(node, iter, before);
        } else if ($(node).hasClass(Strings.glyphName()) || $(node).hasClass(Strings.lineName())) {
            return this._handleStandardNode(node, iter, before);
        } else if ($(node).hasClass(Strings.editorName())) {
            // If this happens, let caller decide what to do with this.
            return Maybe.nothing();
        } else {
            throw new Error("Unhandled selection node in ClickHandler");
        }
    }

    _handleTextNode(node: Node, source_iter: DoubleIterator<Glyph>, before: boolean): Maybe<DoubleIterator<Glyph>> {
        //If text node, search for the span.
        let iter = source_iter.clone();
        let glyph = $(node).parents(Strings.glyphSelector()).first();
        let line = $(node).parents(Strings.lineSelector()).first();
        if(glyph.length > 0) {
            return this._handleStandardNode(glyph.get(0), iter, before);
        } else if (line.length > 0) {
            return this._handleStandardNode(line.get(0), iter, before);
        } else {
            return Maybe.nothing();
        }
    }

    _handleStandardNode(node: Node, source_iter: DoubleIterator<Glyph>, before: boolean): Maybe<DoubleIterator<Glyph>> {
        let iter = source_iter.clone();
        let found_iter = iter.findForward((glyph: ToNode) => {
            let match = false;
            glyph.getNode().caseOf({
                just: (glyphNode) => {
                    match =  node === glyphNode;
                },
                nothing: () => {}
            });
            return match;
        });

        if(found_iter.isValid()) {
            if(before && found_iter.hasPrev()) {
                found_iter.prev();
            }
            // If we found the value, we can set the iterator to this one.
            return Maybe.just(found_iter);
        } else {
            return Maybe.nothing();
        }
    }

    getStartIterator(): Maybe< DoubleIterator<Glyph> > {
        return this.start_iter;
    }

    getEndIterator(): Maybe<DoubleIterator<Glyph> > {
        return this.end_iter;
    }
}

export default ClickHandler;