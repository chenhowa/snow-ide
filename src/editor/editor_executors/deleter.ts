
import { Glyph, GlyphStyle } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import { Renderer } from "editor/editor_executors/renderer";
import Strings from "string-map";
import { ChangeTracker } from "editor/undo_redo/change-buffer";

interface DeleteRenderer {
    deleteAndRender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>)
                                                : Array< DoubleIterator<Glyph> >;
}


class EditorDeleter {
    renderer: Renderer;
    change_tracker: ChangeTracker<Glyph>
    constructor(renderer: Renderer, change_tracker: ChangeTracker<Glyph>) {
        this.renderer = renderer;
        this.change_tracker = change_tracker;
    }

    deleteAndRender(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                                            : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();


        // Check before deleting if we're just deleting a single ListNode. If so, we get to decide
        // on which end of the change buffer to stick the deleted ListNode.
        // Adjust start and end anchor if node to be deleted IS the start ANCHOR or end ANCHOR of the change buffer.
        let insert_at_back = true;
        if( start_iter.equals(end_iter)) {
            if(this.change_tracker.equalsStartAnchor(start_iter)) {
                this.change_tracker.decrementStartAnchor();
                insert_at_back = false;
            } else if (this.change_tracker.equalsEndAnchor(start_iter)) {
                this.change_tracker.incrementEndAnchor();
                insert_at_back = true;
            }
        }

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

                // We definitely want to put the removed node in the change_tracker.
                // We assume here that the buffer's start anchor is at or before source_start_iter,
                // and that the buffer's end anchor is AFTER source_end_iter.
                start_iter.remove(false).caseOf({
                    just: (list_node) => {
                        this.change_tracker.addToBufferEnd(list_node);
                    },
                    nothing: () => {

                    }
                });
            }
        }

        // At this point, start_iter == end_iter. We delete the last glyph that needs to be deleted.        
        start_iter.get().caseOf({
            just: (glyph) => {
                glyph.destroyNode();
            },
            nothing: () => {}
        });
        start_iter.remove(false).caseOf({
            just: (list_node) => {
                if(insert_at_back) {
                    this.change_tracker.addToBufferEnd(list_node);
                } else {
                    this.change_tracker.addToBufferStart(list_node);
                }
            },
            nothing: () => { }
        });

        // If we need to, we insert a newline before rerendering (we might have deleted
        // the initial newline in the document)
        if(!start_iter.isValid()) {
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