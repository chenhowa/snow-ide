import { DoubleIterator } from "data_structures/linked-list";
import { Glyph, ToNode } from "editor/glyph";
import { Maybe } from "tsmonad";
import Cursor from "editor/cursor";
import Strings from "string-map";
import $ from "jquery";
import Handler from "editor/handlers/handler";

class MouseClickHandler implements Handler {
    end_iter: Maybe< DoubleIterator<Glyph> > = Maybe.nothing();
    start_iter: Maybe< DoubleIterator<Glyph> > = Maybe.nothing();
    cursor: Cursor;
    editor: Node;
    constructor(cursor: Cursor, editor: Node) {
        this.cursor = cursor;
        this.editor = editor;
    }

    /**
     * @todo 1. ENFORCE THAT EVENT PAIR IS DOWN FIRST, THEN UP.
     *       2. COMPARE SPANS WITH CURSOR SELECTION
     * @param eventPair Pair of events. First one is for the mousedown. The second is for the mouseup.
     * @param source_iter 
     */
    handle(eventPair: any, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> ) {
        console.log(eventPair);
        let downTarget = eventPair[0].target;
        let upTarget = eventPair[1].target;
        let iter = source_start_iter.clone();

        if( !this._inEditor(downTarget) || !this._inEditor(upTarget)) {
            // Return for now if either target is outside the editor. Later we may have to scroll up or down based on upTarget.

            return;
        }

        if(downTarget === upTarget) {
            // We clicked up and down on the same target.
            // But what the browser thinks we clicked is not nearly as accurate as what selection was made.
        } else {
            // If we didn't click up and down on the same target
            // We need to calculate selection. But this blows up when a selection is already made
        }

        let first_iter = this._getIterator(downTarget, iter);
        let first_distance = 0;
        first_iter.caseOf({
            just: (iterator) => {
                let it = iterator.clone();
                while(it.hasPrev()) {
                    it.prev();
                    first_distance += 1;
                }
            },
            nothing: () => {}
        });

        let second_iter = this._getIterator(upTarget, iter);
        let second_distance = 0;
        second_iter.caseOf({
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
            this.start_iter = first_iter;
            this.end_iter = second_iter;
        } else {
            // Second is first.
            console.log("SECOND");
            this.start_iter = second_iter;
            this.end_iter = second_iter;
        }
    }

    _inEditor(target: Node): boolean {
        if(target === this.editor) {
            return false;
        }

        return this.editor.contains(target);
    }

    _getIterator(node: Node, source_iter: DoubleIterator<Glyph>): Maybe< DoubleIterator<Glyph> > {
        let iter = source_iter.clone();
        if(node.nodeType === 3) {
            return this._handleTextNode(node, iter);
        } else if ($(node).hasClass(Strings.glyphName()) || $(node).hasClass(Strings.lineName())) {
            return this._handleStandardNode(node, iter);
        } else if ($(node).hasClass(Strings.editorName())) {
            // If this happens, let caller decide what to do with this.
            return Maybe.nothing();
        } else {
            throw new Error("Unhandled selection node in ClickHandler");
        }
    }

    _handleTextNode(node: Node, source_iter: DoubleIterator<Glyph>): Maybe<DoubleIterator<Glyph>> {
        //If text node, search for the span.
        let iter = source_iter.clone();
        let glyph = $(node).parents(Strings.glyphSelector()).first();
        let line = $(node).parents(Strings.lineSelector()).first();
        if(glyph.length > 0) {
            return this._handleStandardNode(glyph.get(0), iter);
        } else if (line.length > 0) {
            return this._handleStandardNode(line.get(0), iter);
        } else {
            return Maybe.nothing();
        }
    }

    _handleStandardNode(node: Node, source_iter: DoubleIterator<Glyph>): Maybe<DoubleIterator<Glyph>> {
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

        found_iter.prev();

        if(found_iter.isValid()) {
            // If we found the value, we can set the iterator to this one.
            return Maybe.just(found_iter);
        } else {
            return Maybe.nothing();
        }
    }

    getStartIterator(): Maybe< DoubleIterator<Glyph> > {
        return this.start_iter;
    }

    getEndIterator(): Maybe< DoubleIterator<Glyph> > {
        return this.end_iter;
    }


}


export default MouseClickHandler;