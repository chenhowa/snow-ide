import $ from 'jquery';
import { Maybe } from "tsmonad";
import { ToNode } from "editor/glyph";

import Strings from "string-map";

class Cursor {
    selection: Selection;

    constructor() {
        this.selection = window.getSelection();
    }

    /**
     * @description This function inserts a node in the current cursor's position, between its two sibling nodes, if present.
     *              Therefore the cursor must be correctly positioned
     * @param node 
     */
    insertNode(node: Node) {
        let newNode = $(node);
        if(newNode.hasClass(Strings.lineName())) {
            this.insertLine(newNode);
        } else if (newNode.hasClass(Strings.glyphName()) ) {
            this.insertGlyph(newNode);
        }
        
    }

    insertLine(new_line: JQuery<Node>) {
        if(this.selection.isCollapsed) {
            let currentNode = $(this.selection.anchorNode);

            if(currentNode.hasClass(Strings.editorName())) {
                if(currentNode.contents().length > 0) {
                    new_line.insertBefore(currentNode.contents().get(0));
                } else {
                    currentNode.get(0).appendChild(new_line.get(0));
                }
                
            } else if(currentNode.hasClass(Strings.lineName())) {
                new_line.insertAfter(currentNode);
            } else if(currentNode.hasClass(Strings.glyphName()) ){
                // in a span. So we need to go up to the line and execute
                let lineNode = currentNode.parent(Strings.lineSelector());
                new_line.insertAfter(lineNode);
            } else {
                throw new Error("insertLine: currentNode not yet recognized");
            }

            this.moveCursorToNodeBoundary(new_line.get(0), false);
        }
    }

    insertGlyph(new_glyph: JQuery<Node>) {
        if(this.selection.isCollapsed) {

            let currentNode = $(this.selection.anchorNode);

            if(currentNode.hasClass(Strings.editorName())) {
                // need to find the line and insert if possible. Otherwise throw error.
                let firstLine = currentNode.children(Strings.lineSelector()).first();
                if(firstLine.length > 0) {
                    // guaranteed to have a span.
                    new_glyph.insertBefore(firstLine.contents().first());
                } else {
                    throw new Error("NO FIRST LINE in insertGlyph");
                }
                    
            } else if(currentNode.hasClass(Strings.lineName())) {
                // If cursor is in line, there should be a span containing newline. Insert!
                new_glyph.insertAfter(currentNode.children(Strings.glyphSelector()).last());
            } else if (currentNode.hasClass(Strings.glyphName())){
                new_glyph.insertAfter(currentNode);
                
            } else {
                throw new Error('insertGlyph: current Node not yet supported');
            }

            this.moveCursorToNodeBoundary(new_glyph.get(0), false);
        }
    }

    moveCursorToNode(node: Node, offset: number) {
        this.selection.collapse(node, offset);
    }

    moveCursorToNodeBoundary(node: Node, toStart: boolean) {
        let range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(toStart);
        this.selection.empty();
        this.selection.addRange(range);
    }

    maybeMoveCursorToNodeBoundary(maybe_node: Maybe<ToNode>, toStart: boolean) {
        maybe_node.caseOf({
            just: (glyph) => {
                glyph.getNode().caseOf({
                    just: (node) => {
                        this.moveCursorToNodeBoundary(node, toStart);
                    },
                    nothing: () => {
                        console.log("No node. Could not move cursor to it");
                    }
                });
            },
            nothing: () => { // If node was empty, nothing to do
                console.log("No glyph. Could not move cursor to it");
            }
        })
    }

    isCollapsed(): boolean {
        return this.selection.isCollapsed;
    }

    isSelection(): boolean {
        return !this.selection.isCollapsed;
    }
}

export default Cursor;