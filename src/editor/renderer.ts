
import { Glyph } from "editor/glyph";
import { DoubleIterator } from "data_structures/linked-list";
import Strings from "string-map";
import $ from "jquery";
import {
    findPreviousNewline,
    findLineEnd } from "editor/editor-utils";

interface Renderer {
    render(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, editor: Node): void;
    rerender(start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>, editor: Node): void;
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
    rerender(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>, editor: Node)
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
            // ANSWER. - from start node + 1, find soonest previous newline (inclusive).
            //         - from end node, from next newline (or EOF).
            //      Then rerender starting from the previous newline to ONE BEFORE the next newline
            start_iter.next();
            let prev_line_iter: DoubleIterator<Glyph> = findPreviousNewline(start_iter).caseOf({
                just: (iter) => {
                    return iter;
                },
                nothing: () => {
                    return start_iter.clone();
                }
            });

            let end_of_line_iter: DoubleIterator<Glyph> = findLineEnd(end_iter);
            while(prev_line_iter.isValid()) {
                prev_line_iter.get().caseOf({
                    just: (glyph) => {
                        this.render(prev_line_iter, prev_line_iter, editor);
                    },
                    nothing: () => {
                        // Nothing to render.
                    }
                })

                if(prev_line_iter.equals(end_of_line_iter)) {
                    // If we've rendered up to the end of line, we're done.
                    break;
                } else {
                    // Otherwise continue trying rendering.
                    prev_line_iter.next();
                }
            }
        }
    }

    _rerenderNode(iter: DoubleIterator<Glyph>, node: Node, editor: Node) {
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
    _rerenderLine(source_iter: DoubleIterator<Glyph>, editor: Node) {
        let iter = source_iter.clone();

        // destroy rerendering newline, if it exists.
        iter.get().caseOf({
            just: (glyph) => {
                glyph.destroyNode();
            },
            nothing: () => {

            }
        })

        let prev_line_iter = findPreviousNewline(iter).caseOf({
            just: (prev) => {
                return prev;
            },
            nothing: () => {
                return iter.clone();
            }
        });

        let line_end_iter = findLineEnd(iter);
        while(prev_line_iter.isValid()) {
            this.render(prev_line_iter, prev_line_iter, editor);

            if(prev_line_iter.equals(line_end_iter)) {
                break;
            } else {
                prev_line_iter.next();
            }
        }
    }


    /**
     * @description Renders the node within the editor. Will destroy existing representations if they exist.
     *              Meant for rendering SINGLE NODES, regardless of surrounding context. 
     *              Will not correctly render newly inserted newlines, for exaple.
     *              Use rerender instead.
     * @param start_iter - Not modified.
     * @param end_iter - Not modified.
     * @param editor - modified.
     */
    render(source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>, editor: Node)
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

    _renderNode(iter: DoubleIterator<Glyph>, node: Node, editor: Node) {
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

    _renderLine(iter: DoubleIterator<Glyph>, newline: Node, editor: Node) {
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

    _renderGlyph(iter: DoubleIterator<Glyph>, new_glyph: Node, editor: Node) {
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