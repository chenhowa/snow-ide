
import { ToNode } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import Strings from "string-map";
import $ from "jquery";

interface Renderer {
    render(start_iter: DoubleIterator<ToNode>, end_iter: DoubleIterator<ToNode>, editor: Node): void;
    rerender(start_iter: DoubleIterator<ToNode>, end_iter: DoubleIterator<ToNode>, editor: Node): void;
}


class EditorRenderer implements Renderer {
    constructor() {

    }

    /**
     * @description Rerenders what iterator is pointing at. Useful for difficult to render things like 
     *              newline insertions.
     * @param source_start_iter  - Not modified
     * @param source_end_iter - Not modified
     * @param editor  - Modified.
     */
    rerender(source_start_iter: DoubleIterator<ToNode>, source_end_iter: DoubleIterator<ToNode>, editor: Node)
                                                                            : void {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        if(start_iter.equals(end_iter)) {
            start_iter.get().caseOf({
                just: (glyph) => {
                    glyph.getNode().caseOf({
                        just: (node) => {
                            this._rerenderNode(start_iter, node, editor);
                        },
                        nothing: () => {
                            this._rerenderNode(start_iter, glyph.toNode(), editor);
                        }
                    })
                },
                nothing: () => {
                    // Nothing to rerender. So we do nothing.
                }
            });
        } else {
            // TODO : How to rerender the set of nodes contained within two start and end iterators?
            // ANSWER. - from start node, find soonest previous newline (inclusive).
            //         - from end node, 
        }
    }

    _rerenderNode(iter: DoubleIterator<ToNode>, node: Node, editor: Node) {
        let newNode = $(node);
        if(newNode.hasClass(Strings.lineName())) {
            this._rerenderLine(iter, editor);
        } else {
            // If we are not rerendering a newline, we will just destroy and rerender the node
            // through the this.render() method.
            this.render(iter, iter, editor);
        }
    }

    /**
     * 
     * @param iter // iterator pointing at the newline to rerender.
     * @param editor 
     */
    _rerenderLine(iter: DoubleIterator<ToNode>, editor: Node) {
        // TODO: Fix bug. Presseing enter in a 3 line text deletes the next-next line.

        // destroy rerendering newline, if it exists.
        iter.get().caseOf({
            just: (glyph) => {
                glyph.destroyNode();
            },
            nothing: () => {

            }
        })

        let back_iter = iter.clone();
        let foundPrevLine = false;
        while(back_iter.hasPrev() && !foundPrevLine) {
            back_iter.prev();
            back_iter.get().caseOf({
                just: (glyph) => {
                    glyph.getNode().caseOf({
                        just: (node) => {
                            foundPrevLine = $(node).hasClass(Strings.lineName())
                            glyph.destroyNode();
                        },
                        nothing: () => {
                            // Nothing to destroy. Do nothing.
                        }
                    })
                },
                nothing: () => {
                    // Nothing to rerender. Do nothing.
                }
            })
        }

        let forward_iter = iter.clone();
        let foundNextLine = false;
        while(forward_iter.hasNext() && !foundNextLine) {
            forward_iter.next();
            forward_iter.get().caseOf({
                just: (glyph) => {
                    glyph.getNode().caseOf({
                        just: (node) => {
                            foundNextLine = $(node).hasClass(Strings.lineName());
                        },
                        nothing: () => {
                            // Nothing to destroy. Do nothing.
                        }
                    })
                },
                nothing: () => {
                    // Nothing to destroy.
                }
            });
        }

        let end_iter = forward_iter.clone();
        if(foundNextLine) {
            end_iter.prev(); // Rerendering will end and include this iterator, and NOT the next newline.
        }

        //Prepare to rerender.
        let rerender_iter = back_iter.clone();
        rerender_iter.prev();
        while(!rerender_iter.equals(end_iter)) {
            rerender_iter.next();
            this.render(rerender_iter, rerender_iter, editor);
        }
    }


    /**
     * @description Renders the node within the editor. Will destroy existing representations if they exist.
     *              Meant for rendering SINGLE NODES. Will not correctly render newlines, for exaple.
     *              Use rerender instead.
     * @param start_iter - Not modified.
     * @param end_iter - Not modified.
     * @param editor - modified.
     */
    render(source_start_iter: DoubleIterator<ToNode>, source_end_iter: DoubleIterator<ToNode>, editor: Node)
                                                            : void {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        if(start_iter.equals(end_iter)) {
            start_iter.get().caseOf({
                just: (glyph) => {
                    // We have something to render.
                    glyph.destroyNode(); // Destroy old representation, if any.
                    this._renderNode(start_iter, glyph.toNode(), editor);
                },
                nothing: () => {
                    // We have nothing to render. So we do nothing.
                }
            });
        } else {
            // Render everything to the RIGHT of the start_iter,
            // up to but NOT PAST the end_iter.
            while(start_iter.hasNext()) {
                start_iter.next();
                start_iter.get().caseOf({
                    just: (glyph) => {
                        glyph.destroyNode(),
                        this._renderNode(start_iter, glyph.toNode(), editor);
                    },
                    nothing: () => {
                        // We have nothing to render. So we do nothing.
                    }
                });
                if(start_iter.equals(end_iter)) {
                    break;
                }
            }
        }
    }

    _renderNode(iter: DoubleIterator<ToNode>, node: Node, editor: Node) {
        /* Where do we render it? And how? We decide based on the current
            character and the previous character. We have several cases:

            1. Current is newline. Then we insert after current line, or if that is not found, we insert as line at start of editor.
            2. Current is NOT newline. Then we insert in current line (after prev glyph), or if that is not found, we insert after previous glyph.
        */
        let newNode = $(node);
        if(newNode.hasClass(Strings.lineName())) {
            this._renderLine(iter, node, editor);
        } else if (newNode.hasClass(Strings.glyphName()) ) {
            this._renderGlyph(iter, node, editor);
        }
    }

    _renderLine(iter: DoubleIterator<ToNode>, newline: Node, editor: Node) {
        //1. Current is newline. Then we insert after current line, or if that is not found, we assume editor is empty and append.
        let scan_iter = iter.clone();
        let found_valid_prev = false;
        while(scan_iter.hasPrev() && !found_valid_prev) {
            scan_iter.prev();
            scan_iter.get().caseOf({
                just: (glyph) => {
                    glyph.getNode().caseOf({
                        just: (node) => {
                            let prevNode = $(node);
                            let oldline: JQuery<Node>;
                            if(prevNode.hasClass(Strings.lineName())) {
                                oldline = prevNode;
                            } else {
                                oldline = $(node).parents(Strings.lineSelector()).first();
                            }

                            if(oldline.length > 0) {
                                //Found line. We will insert after this line.
                                found_valid_prev = true;
                                $(newline).insertAfter(oldline);
                            } else {
                                console.log('did not find valid oldline');
                            }
                        },
                        nothing: () => {
                            console.log("no node to render. What do?");
                        }
                    })
                },
                nothing: () => {}
            })
        } 

        if(!found_valid_prev) {
            // If the previous step did not succeed, we can only insert at start of editor.
            let firstLine = $(editor).children(Strings.lineSelector()).first();
            if(firstLine.length > 0) {
                $(newline).insertBefore(firstLine);
            } else {
                editor.appendChild(newline);
            }
        }
    }

    _renderGlyph(iter: DoubleIterator<ToNode>, new_glyph: Node, editor: Node) {
        //2. Current is NOT newline. Then we insert in current line (after prev glyph), or if that is not found, we insert after previous glyph.
        let scan_iter = iter.clone();
        let found_valid_prev = false;
        while(scan_iter.hasPrev() && !found_valid_prev) {
            scan_iter.prev();
            scan_iter.get().caseOf({
                just: (glyph) => {
                    glyph.getNode().caseOf({
                        just: (node) => {
                            let prevNode = $(node);
                            let old_glyph: JQuery<Node> = prevNode.parents(Strings.glyphSelector()).first();
                            if(prevNode.hasClass(Strings.lineName())) {
                                // We found a line! Let's insert/append to it.
                                found_valid_prev = true;
                                let newline = prevNode.children(Strings.newlineSelector()).first();
                                if(newline.length > 0 ){
                                    $(new_glyph).insertAfter(newline);
                                } else {
                                    prevNode.get(0).appendChild(new_glyph);
                                }
                            } else if (prevNode.hasClass(Strings.glyphName())){
                                old_glyph = prevNode;
                            } else {
                                old_glyph = prevNode.parents(Strings.glyphSelector()).first();
                            }

                            if(old_glyph.length > 0) {
                                //Found glyph. We will insert after this glyph
                                found_valid_prev = true;
                                $(new_glyph).insertAfter(old_glyph);
                            }
                        },
                        nothing: () => {
                            console.log("No glyph to render. What do?");
                        }
                    })
                },
                nothing: () => {}
            })
        } 

        if(!found_valid_prev) {
            // If the previous step did not succeed, we can only insert at start of editor.
            // REALLY WE SHOULD THROW AN EXCEPTION HERE AND RERENDER THE DOCUMENT.
            editor.appendChild(new_glyph);
        }
    }
}


export { EditorRenderer, Renderer };