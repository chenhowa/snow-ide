import { Maybe } from "tsmonad";
import $ from "jquery";
import Cursor from 'editor/editor_executors/cursor';
import { Glyph, GlyphStyle } from 'editor/glyph';
import { LinkedList, List, DoubleIterator } from 'data_structures/linked-list';
import { fromEvent } from 'rxjs';
import Strings from "string-map";
import { EditorExecutor, EditorActionExecutor } from "editor/editor_executors/editor-executor";
import { EditorRenderer } from "editor/editor_executors/renderer";

import { 
    Handler, 
    ClickHandler, 
    KeydownHandler,
} from "editor/handlers/handlers";

import { KeyPressMap } from "editor/keypress-map";

import KeyPressMapSingleton from "editor/singletons/keypress-map-singleton";
import { 
    SavePolicy,
    SaveData,
    KeyDownTimeSavePolicy,
    CurrentKeySavePolicy,
    SetPolicies,
    SwitchInsertDeleteSavePolicy,
    SwitchBackspaceDeleteSavePolicy,
    SwitchCharSpaceSavePolicy
} from "editor/undo_redo/policies/save-policies";

import { ChangeBuffer, EditorChangeBuffer, ChangeTracker } from "editor/undo_redo/change-buffer";
import SavePolicySingleton from "./singletons/save-policy-singleton";


/*
    TODO : INCORPORATE POLICY AND CHANGE BUFFER INTO THE EDITOR.
    TODO : RESET FUNCTION SHOULD ALSO RESET THE STATE OF THE CHANGE BUFFER and the COMMAND HISTORY.
*/

class Editor {
    glyphs: List<Glyph>;
    start_glyph_iter: DoubleIterator<Glyph>;
    end_glyph_iter: DoubleIterator<Glyph>;
    editor: JQuery<HTMLElement>;
    cursor: Cursor = new Cursor();
    executor: EditorExecutor;
    click_handler: Handler;
    keypress_map: KeyPressMap;
    keydown_handler: Handler;
    change_buffer: ChangeBuffer<Glyph> & ChangeTracker<Glyph>;


    static new = function(editor_id?: string): Maybe<Editor> {
        let editor: Editor = new Editor(editor_id);
        if(editor.valid()) {
            return Maybe.just(editor);
        } else {
            return Maybe.nothing();
        }
    };

    constructor(editor_id?: string) {
        // configure save policies for undo/redo for the entire editor.
        let policy = SavePolicySingleton.get();
        policy.setPolicies([
            new SwitchInsertDeleteSavePolicy(),
            new CurrentKeySavePolicy(),
            new SwitchBackspaceDeleteSavePolicy(),
            new SwitchCharSpaceSavePolicy()
        ]);

        this.glyphs = new LinkedList(); // list of characters and the styles they should be rendered with.

        this.cursor = new Cursor(); // object responsible for rendering the cursor according to the editor's state.
        if(editor_id) {
            this.editor = $(editor_id);
        } else {
            this.editor = $('#editor');
        }
        this.keypress_map = KeyPressMapSingleton.get();
        this.keypress_map.runOn(this.editor);

        this.change_buffer = new EditorChangeBuffer(
            this.glyphs.makeFrontIterator(), this.glyphs.makeBackIterator(), new EditorRenderer(this.editor.get(0))
        );

        this.executor = new EditorActionExecutor(this.change_buffer, this.editor.get(0));
        
        this.start_glyph_iter = this.glyphs.makeFrontIterator();
        this.end_glyph_iter = this.glyphs.makeFrontIterator();
        this.keydown_handler = new KeydownHandler(
            this.executor, this.editor.get(0), this.keypress_map, this.change_buffer
        );
        this.click_handler = new ClickHandler(this.cursor, this.editor.get(0));

        if(this.valid()) {
            this.reset();
        }
    }

    showBuffer(): string {
        return (this.change_buffer.asString());
    }

    reset(): void {
        this.editor.empty();
        this.editor.attr('spellcheck', 'false');
        this.glyphs.empty();
        this.end_glyph_iter = this.glyphs.makeFrontIterator();
        this.end_glyph_iter.insertAfter(new Glyph('\n', new GlyphStyle()));
        this.end_glyph_iter.next();
        this.end_glyph_iter.insertAfter(new Glyph('a', new GlyphStyle()));
        this.end_glyph_iter.next(); // We stay pointing at 'a', so cursor should be between a and b
        this.start_glyph_iter = this.end_glyph_iter.clone();
        this.end_glyph_iter.insertAfter(new Glyph('b', new GlyphStyle()));
        this.rerender();
    }

    rerender() {
        this.editor.empty();

        let iterator = this.glyphs.makeFrontIterator();
        while(iterator.hasNext()) {
            iterator.next();
            this.executor.renderAt(iterator);
        }

        this.updateCursorToCurrent(); // Initially is between a and b!
    }

    getDocument(): Array<string> {
        return this.glyphs.asArray().map((glyph) => {
            return glyph.glyph;
        })
    }

    valid(): boolean {
        return this.editor.length !== 0;
    }

    run() {
        // We assume that a glyph that glyph_iter points to is the one that would be removed by BACKSPACE.
        // Hence the cursor will be IN FRONT of it.

        // Render initial state of document.
        this.rerender();

        let pasteObs = fromEvent(this.editor, 'paste');
        let pasteSub = pasteObs.subscribe({
            next: (event: any) => {
                // get data and supposedly remove non-utf characters.
                let pasteText = event.originalEvent.clipboardData.getData('text')
                pasteText = pasteText.replace(/[^\x20-\xFF]/gi, '');
            },
            error: (err) => { },
            complete: () => { }
        });

        let keydownObs = fromEvent(this.editor, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {

                this.keydown_handler.handle(event, this.start_glyph_iter.clone(), this.end_glyph_iter.clone());
                this._updateIteratorsFromHandler(this.keydown_handler);
                this.updateCursorToCurrent();
            },
            error: (err) => {},
            complete: () => {}
        });

        let mouseDownObs = fromEvent(this.editor, 'mousedown');
        let mouseDownSub = mouseDownObs.subscribe({
            next: (event: any) => {
                // Need to collapse selection on mouse down because otherwise it breaks a bunch of other shit
                // in chrome.
                if(this.cursor.isSelection()) {
                    // If is selection, start mousedown by collapsing the selection.
                    this.cursor.selection.removeAllRanges();
                }
            },
            error: (err) => { },
            complete: () => { }
        });

        let mouseUpObs = fromEvent(this.editor, 'mouseup');
        let mouseUpSub = mouseUpObs.subscribe({
            next: (event: any) => {
                // TODO : Do something on mouseup, in case you mouse up outside of div, but had moused down in.
                //          -- looks like click doesn't register if you do this.
                // TODO : Do something on mousedown, in case you mouse down outside of editor but mouse up in.
                //          -- looks like click doesn't register if you do this.
                // RESULT TODO : Might need to sync INPUT (backspace, char, tab, enter, etc.) with the selection,
                //          Since invalid selections can still occur by the two above methods.
            },
            error: (err) => {},
            complete: () => {}
        })

        let clickObs = fromEvent(this.editor, 'click');
        let clickSub = clickObs.subscribe({
            next: (event: any) => {
                this.click_handler.handle(event, this.glyphs.makeFrontIterator(), this.glyphs.makeBackIterator());
                this._updateIteratorsFromHandler(this.click_handler);
                this.updateCursorToCurrent();
            },
            error: (err) => {},
            complete: () => {}
        });

        let focusObs = fromEvent(this.editor, 'focus');
        let focusSub = focusObs.subscribe({
            next: (event: any) => {
            },
            error: (err) => {},
            complete: () => {}
        });
    }

    _updateIteratorsFromHandler(handler: Handler) {
        handler.getStartIterator().caseOf({
            just: (iter) => {
                this.start_glyph_iter = iter;
            },
            nothing: () => {
                this.start_glyph_iter = this.glyphs.makeFrontIterator();
                if(this.start_glyph_iter.hasNext()) {
                    this.start_glyph_iter.next();
                } else {
                    throw new Error("Empty list. Need newline");
                }
            }
        });
        handler.getEndIterator().caseOf({
            just: (iter) => {
                this.end_glyph_iter = iter;
            },
            nothing: () => {
                this.end_glyph_iter = this.start_glyph_iter.clone();
            }
        });
    }

    /**
     * @description Updates cursor to be right after character of this.glyph_iter.
     *              For visual feedback only.
     */
    updateCursorToCurrent() {
        this.updateCursor(this.start_glyph_iter, this.end_glyph_iter);
    }

    /**
     * @description Updates cursor to be RIGHT AFTER character that iterator is pointing to.
     *              THIS IS FOR VISUAL FEEDBACK ONLY. Cursor placement is inaccurate and tricky. Don't use for data manip.
     * @param source_start
     * @param source_end 
     */
    updateCursor(source_start: DoubleIterator<Glyph>, source_end: DoubleIterator<Glyph>) {
        // THIS IS FOR VISUAL FEEDBACK TO USER ONLY.
        // Using the cursor for direct insert is error prone, as it may be misplaced.
        let start = source_start.clone();
        let end = source_end.clone();

        if(start.equals(end)) {
            // If both start and end point to the same glyph, we collapse the cursor to one.
            end.get().caseOf({
                just: (glyph) => {
                    if(glyph.glyph === Strings.newline) {
                        glyph.getNode().caseOf({
                            just: (newlineNode) => {
                                let glyphNode = $(newlineNode).children(Strings.glyphSelector()).first();
                                if(glyphNode.length > 0) {
                                    this.cursor.moveCursorToNodeBoundary(glyphNode.get(0), false);
                                } else {
                                    throw new Error("DID NOT FIND A HIDDEN SPAN IN LINE DIV");
                                }
                            },  
                            nothing: () => {}
                        });
                    } else {
                        // Otherwise we just move cursor to node, if it has been rendered.
                        glyph.getNode().caseOf({
                            just: (spanNode) => {
                                this.cursor.moveCursorToNodeBoundary(spanNode, false);
                            },
                            nothing: () => {}
                        })
                    }
                },
                nothing: () => {
                    // This should only happen when end_glyph_iter is at front sentinel..
                    // we attempt to repair state.
                    let temp = this.glyphs.makeFrontIterator();
                    if(temp.hasNext()) {
                        temp.next();
                        this.start_glyph_iter = temp.clone();
                        this.end_glyph_iter = temp.clone();
    
                        this.updateCursor(this.start_glyph_iter, this.end_glyph_iter);
                    } else {
                        throw new Error("Found empty glyph. Could not move cursor to it. Could not repair");
                    }
                }
            });
        } else {
            // If start and end are not equal, we ASSUME that start is before end,
            // and we update the selection to reflect this. We also
            // assume, for now, that start and end are guaranteed to be pointing
            // to valid nodes (not sentinel and not empty);
            let start_glyph = start.grab();
            let end_glyph = end.grab();

            this.cursor.selection.empty();
            let range = new Range();

            start_glyph.getNode().caseOf({
                just: (start_node) => {
                    if($(start_node).hasClass(Strings.lineName())) {
                        let firstGlyph = $(start_node).children(Strings.glyphSelector()).first();
                        if(firstGlyph.length > 0 ) {
                            start_node = firstGlyph.get(0);
                        } else {
                            throw new Error("line's first span does not exist");
                        }
                    }
                    range.setStart(start_node, start_node.childNodes.length);
                },
                nothing: () => {
                    // For now, do nothing.
                }
            });

            end_glyph.getNode().caseOf({
                just: (end_node) => {
                    if($(end_node).hasClass(Strings.lineName())) {
                        let firstGlyph = $(end_node).children(Strings.glyphSelector()).first();
                        if(firstGlyph.length > 0 ) {
                            end_node = firstGlyph.get(0);
                        } else {
                            throw new Error("line's first span does not exist");
                        }
                    }
                    range.setEnd(end_node, end_node.childNodes.length);
                },
                nothing: () => {

                }
            });

            this.cursor.selection.addRange(range);
        }

        
    }


}


export default Editor;