
import { Glyph, ToNode, GlyphStyle } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import { Renderer } from "editor/renderer";
import Strings from "string-map";
import $ from "jquery";

interface DeleteRenderer {
    deleteAndRender(iter: DoubleIterator<ToNode>, editor: Node, direction: boolean): void;
}


class EditorDeleter {
    renderer: Renderer;
    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    deleteAndRender(iter: DoubleIterator<ToNode>, editor: Node, direction: boolean): void {
        iter.get().caseOf({
            just: (glyph) => {
                glyph.getNode().caseOf({
                    just: (node) => {
                        this._deleteGlyphAndRerender(iter, node, editor, direction);
                    },
                    nothing: () => {
                        // If node was not rendered, nothing to do but remove the cell.
                        iter.remove(direction);
                    }
                });
            },
            nothing: () => {
                // The cell is empty. Might as well delete it.
                iter.remove(direction);
            }
        });
    }

    _deleteGlyphAndRerender(iter: DoubleIterator<ToNode>, node: Node, editor: Node, direction: boolean) {
        let deadNode = $(node);
        iter.remove(direction);

        if(deadNode.hasClass(Strings.lineName())) {
            deadNode.remove();
            // If we are deleting a line, we derender everything in this line and previous line, and then rerender
            // previous line and remainder of this line.
            let deleteIterator = iter.clone();
            if(direction) {
                // If we went forward, we need to adjust for algorithm by backing up one.
                deleteIterator.prev();
            }
            let foundNextLine = false;
            while(deleteIterator.hasNext() && !foundNextLine) {
                deleteIterator.next();
                deleteIterator.get().caseOf({
                    just: (glyph) => {
                        glyph.getNode().caseOf({
                            just: (node) => {
                                if($(node).hasClass(Strings.lineName())) {
                                    foundNextLine = true;
                                } else {
                                    glyph.destroyNode();
                                }
                            },
                            nothing: () => {
                                // If node was empty, nothing to destroy.
                            }
                        });
                    },
                    nothing: () => {
                        // If the cell was empty, just remove it.
                        deleteIterator.remove(false);
                    }
                });
            }
            let endIterator = deleteIterator.clone();  // This marks the stopping point of the rerendering later.
            if(foundNextLine) {
                endIterator.prev();
            }

            // Then we go backward and derender the entire previous line.
            let foundPrevLine = false;
            while(deleteIterator.hasPrev() && !foundPrevLine) {
                deleteIterator.prev();
                deleteIterator.get().caseOf({
                    just: (glyph) => {
                        glyph.getNode().caseOf({
                            just: (node) => {
                                if($(node).hasClass(Strings.lineName())) {
                                    glyph.destroyNode();
                                    foundPrevLine = true;
                                } else {
                                    glyph.destroyNode();
                                }
                            },
                            nothing: () => {

                            }
                        })
                    },
                    nothing: () => {
                        deleteIterator.remove(true);
                    }
                })
            }

            // Now we rerender 
            let renderIterator = deleteIterator.clone();
            renderIterator.prev();
            if(!foundPrevLine) {
                // We MUST have a newline at start for document rendering to work correctly.
                renderIterator.insertAfter(new Glyph("\n", new GlyphStyle()));
            }
            while(!renderIterator.equals(endIterator)) {
                renderIterator.next();
                this.renderer.render(renderIterator, editor);
            }

        } else if (deadNode.hasClass(Strings.glyphName())) {
            // If we are just deleting a glyph node, all we do is destroy it.
            // No need to rerender.
            deadNode.remove();
        } else {
            throw new Error("Unhandled node being deleted");
        }
    }
}



export { DeleteRenderer, EditorDeleter };