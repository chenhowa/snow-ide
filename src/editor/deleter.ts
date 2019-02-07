
import { Glyph, GlyphStyle } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import { Renderer } from "editor/renderer";
import Strings from "string-map";
import $ from "jquery";

interface DeleteRenderer {
    deleteAndRender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, editor: Node, direction: boolean)
                                                : Array< DoubleIterator<Glyph> >;
}


class EditorDeleter {
    renderer: Renderer;
    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    deleteAndRender(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>, editor: Node, direction: boolean)
                            : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        if(start_iter.equals(end_iter)) {
            let return_iter = start_iter.get().caseOf({
                just: (glyph) => {
                    return glyph.getNode().caseOf({
                        just: (node) => {
                            return this._deleteGlyphAndRerender(start_iter, node, editor, direction);
                        },
                        nothing: () => {
                            // If node was not rendered, nothing to do but remove the cell.
                            start_iter.remove(direction);
                            return start_iter.clone();
                        }
                    });
                },
                nothing: () => {
                    // The cell is empty. Might as well delete it.
                    start_iter.remove(direction);
                    return start_iter.clone();
                }
            });

            return [return_iter.clone(), return_iter.clone()];
        } else {
            // TODO - do something different if the selection is spread out.
        }
        

        return [start_iter.clone(), end_iter.clone()];
    }

    _deleteGlyphAndRerender(source_iter: DoubleIterator<Glyph>, node: Node, editor: Node, direction: boolean) : DoubleIterator<Glyph> {
        let deadNode = $(node);
        let isLine = deadNode.hasClass(Strings.lineName());
        let isGlyph = deadNode.hasClass(Strings.glyphName());

        let iter = source_iter.clone();

        // Get rid of node from screen and from list.
        deadNode.remove();
        iter.remove(direction);

        // Rerender document parts that require it.
        if(isLine) {
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
                endIterator.prev(); // We don't want to rerender the new line, so we back up one.
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
                // rerender all the needed glyphs.
                renderIterator.next();
                this.renderer.render(renderIterator, renderIterator, editor);
            }

        } else if (isGlyph) {
            // No need to do anything. Deleted glyph and removed rendered node earlier.
        } else {
            throw new Error("Unhandled node being deleted");
        }

        return iter.clone();
    }
}



export { DeleteRenderer, EditorDeleter };