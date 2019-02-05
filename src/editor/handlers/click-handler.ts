


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
    iterator: Maybe< DoubleIterator<Glyph> > = Maybe.nothing();
    cursor: Cursor;
    constructor(cursor: Cursor) {
        this.cursor = cursor;
    }

    handle(event: any, iter: DoubleIterator<Glyph>) {
        console.log(event);
        console.log(this.cursor.selection);

        /* In click handler, set the position of the iterator according to 
           where the cursor is now located. Three possibilities of where the cursor now is:
            1. in a text node.
            2. in a glyph span node.
            3. In a line div node.
            4. in the editor node.
        */
        if(this.cursor.isCollapsed()) {
            let node = this.cursor.selection.anchorNode;
            let offset = this.cursor.selection.anchorOffset;

            if(node.nodeType === 3) {
                console.log("text node");
                this._handleTextNode(node, iter);
            } else if ($(node).hasClass(Strings.glyphName()) || $(node).hasClass(Strings.lineName())) {
                console.log("standard node");
                this._handleStandardNode(node, iter);
            } else if ($(node).hasClass(Strings.editorName())) {
                // If this happens, let caller decide what to do with this.
                console.log("else 2");
                this.iterator = Maybe.nothing();
            } else {
                throw new Error("Unhandled selection node in ClickHandler");
            }
        } else {
            console.log("else 1");
            this.iterator = Maybe.nothing();
        }
    }

    _handleTextNode(node: Node, iter: DoubleIterator<Glyph>) {
        //If text node, search for the span.
        let glyph = $(node).parents(Strings.glyphSelector()).first();
        let line = $(node).parents(Strings.lineSelector()).first();
        let targetNode = glyph.get(0);
        if(glyph.length > 0) {
            console.log("text glyph");
            this._handleStandardNode(glyph.get(0), iter);
        } else if (line.length > 0) {
            console.log ("text line");
            this._handleStandardNode(line.get(0), iter);
        } else {
            console.log("text not found");
            this.iterator = Maybe.nothing();
        }
    }

    _handleStandardNode(node: Node, iter: DoubleIterator<Glyph>) {
        let found_iter = iter.findForward((glyph: ToNode) => {
            let match = false;
            glyph.getNode().caseOf({
                just: (glyphNode) => {
                    match =  node === glyphNode;
                },
                nothing: () => {}
            })
            return match;
        });

        if(found_iter.isValid()) {
            console.log("found");
            // If we found the value, we can set the iterator to this one.
            this.iterator = Maybe.just(found_iter);
        } else {
            console.log("not found");
            this.iterator = Maybe.nothing();
        }
    }

    getNewIterators(): Maybe< DoubleIterator<Glyph> > {
        return this.iterator;
    }
}

export default ClickHandler;