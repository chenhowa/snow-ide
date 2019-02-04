import $ from 'jquery';
import { Maybe } from "tsmonad";
import { ToNode } from "editor/glyph";

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
        if(this.selection.isCollapsed) {

            let currentNode = $(this.selection.anchorNode);

            if(currentNode.hasClass('preserve-whitespace')) {
                console.log('Node was editor: preserve-whitespace. INCORRECT');
                currentNode.children('.first-line').get(0).appendChild(node);
            } else if(currentNode.hasClass('line')) {
                currentNode.get(0).appendChild(node);
            } else {
                let parentNode = currentNode.parent();
                parentNode.get(0).appendChild(node);
            }

            this.moveCursorToNodeBoundary(node, false);

            
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
                        console.log("moved cursor to after the glyph");
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