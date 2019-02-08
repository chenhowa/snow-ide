
import { Glyph, GlyphStyle } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import { Renderer } from "editor/editor_executors/renderer";
import Strings from "string-map";

interface DeleteRenderer {
    deleteAndRender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, direction: boolean)
                                                : Array< DoubleIterator<Glyph> >;
}


class EditorDeleter {
    renderer: Renderer;
    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    deleteAndRender(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>, 
                        direction: boolean)
                                                            : Array< DoubleIterator<Glyph> > {
        console.log("DELETING AND RENDERING");
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();

        // First we remove and destroy nodes until start_iter equals end_iter.
        // then we remove the node at start_iter == end_iter, and move
        // in the correct direction. Then we rerender.
        while(!start_iter.equals(end_iter) && start_iter.hasNext()) {
            start_iter.next();
            if(start_iter.equals(end_iter)) {
                break;
            } else {
                start_iter.get().caseOf({
                    just: (glyph) => {
                        glyph.destroyNode();
                    },
                    nothing: () => {}
                });
                start_iter.remove(false);
            }
        }

        // At this point, start_iter == end_iter. We delete the last glyph that needs to be deleted.
        start_iter.get().caseOf({
            just: (glyph) => {
                glyph.destroyNode();
            },
            nothing: () => {}
        });
        start_iter.remove(false);
        // If we need to, we insert a newline before rerendering (we might have deleted
        // the initial newline in the document)
        if(!start_iter.isValid()) {
            console.log("WAS NOT VALID");
            // If not valid, we are at the front sentinel of the linked list.
            let next_iter = start_iter.clone();
            next_iter.next();
            let shouldInsert = next_iter.get().caseOf({
                just: (glyph) => {
                    return !(glyph.glyph === Strings.newline);
                },
                nothing: () => {
                    return true;
                }
            });
            if(shouldInsert) {
                start_iter.insertAfter(new Glyph(Strings.newline, new GlyphStyle()));
                start_iter.next();
            }
        }

        // Now we rerender.
        end_iter = start_iter.clone(); // restore the validity of end_iter.
        this.renderer.rerender(start_iter, end_iter);

        return [start_iter.clone(), end_iter.clone()];
    }
}



export { DeleteRenderer, EditorDeleter };