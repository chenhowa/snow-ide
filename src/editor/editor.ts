import { Maybe } from "tsmonad";
import $ from "jquery";
import Cursor from 'editor/editor_executors/cursor';
import { Glyph, GlyphStyle } from 'editor/glyph';
import { LinkedList, List, DoubleIterator } from 'data_structures/linked-list';
import { fromEvent, Observable, merge } from 'rxjs';
import { map, throttleTime } from "rxjs/operators";
import Strings from "string-map";
import { Renderer, EditorRenderer } from "editor/editor_executors/renderer";

import { 
    Handler, 
    ClickHandler, 
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
    SwitchCharSpaceSavePolicy,
    ActionSavePolicy
} from "editor/undo_redo/policies/save-policies";

import { ChangeBuffer, EditorChangeBuffer, ChangeTracker } from "editor/undo_redo/change-buffer";
import SavePolicySingleton from "editor/singletons/save-policy-singleton";
import ChangeBufferSingleton from "editor/singletons/change-buffer-singleton";

import KeydownProcessor from "editor/subjects_observables/keydown-processor";
import { NewActionData, Action } from "editor/subjects_observables/action-processor";


import ActionProcessor from "editor/subjects_observables/action-processor";
import SaveProcessor from "editor/subjects_observables/save-processor";
import ExecuteProcessor, { RenderAction, RenderData, ExecuteData } from "editor/subjects_observables/execute-processor";


/*
    TODO : INCORPORATE POLICY AND CHANGE BUFFER INTO THE EDITOR.
    TODO : RESET FUNCTION SHOULD ALSO RESET THE STATE OF THE CHANGE BUFFER and the COMMAND HISTORY.
*/

interface NewCursorData {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
}

class Editor {
    glyphs: List<Glyph>;
    start_glyph_iter: DoubleIterator<Glyph>;
    end_glyph_iter: DoubleIterator<Glyph>;
    editor: JQuery<HTMLElement>;
    cursor: Cursor = new Cursor();
    click_handler: Handler;
    keypress_map: KeyPressMap;
    renderer: Renderer;


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
            new SwitchCharSpaceSavePolicy(),
            new ActionSavePolicy()
        ]);

        this.glyphs = new LinkedList(); // list of characters and the styles they should be rendered with.

        this.cursor = new Cursor(); // object responsible for rendering the cursor according to the editor's state.
        if(editor_id) {
            this.editor = $(editor_id);
        } else {
            this.editor = $('#editor');
        }

        this.renderer = new EditorRenderer(this.editor.get(0));

        this.keypress_map = KeyPressMapSingleton.get();
        this.keypress_map.runOn(this.editor);

        let change_buffer: ChangeBuffer<Glyph> & ChangeTracker<Glyph> = ChangeBufferSingleton.get(
            this.editor, this.glyphs
        );
                
        this.start_glyph_iter = this.glyphs.makeFrontIterator();
        this.end_glyph_iter = this.glyphs.makeFrontIterator();
        
        this.click_handler = new ClickHandler(this.cursor, this.editor.get(0));

        if(this.valid()) {
            this.reset();
        }
    }

    showBuffer(): string {
        return (ChangeBufferSingleton.get(this.editor, this.glyphs).asString());
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

    // TODO : Fix this function. Executor no longer works. How do we rerender?
    rerender() {
        this.editor.empty();

        let iterator = this.glyphs.makeFrontIterator();
        while(iterator.hasNext()) {
            iterator.next();
            this.renderer.render(iterator, iterator);
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

        let pasteObs: Observable<NewActionData> = fromEvent(this.editor, 'paste').pipe(map((event: any) => {
            event.preventDefault();
            let pasteText = event.originalEvent.clipboardData.getData('text');
            console.log(pasteText);
            //pasteText = pasteText.replace(/[^\x20-\xFF]/gi, '');
            console.log(this.start_glyph_iter);
            console.log(this.end_glyph_iter);
            let execute_data: NewActionData = {
                key: pasteText,
                start: this.start_glyph_iter.clone(),
                end: this.end_glyph_iter.clone(),
                action: Action.Paste
            };
            return execute_data;
        }));

        let copyObs = fromEvent(this.editor, 'copy');
        copyObs.subscribe({
            next: (event: any) => {
                event.preventDefault();
                console.log("COPYING");
                console.log(event);
                console.log(event.originalEvent.clipboardData.getData('text'));

            }
        });

        const keydownObs = fromEvent(this.editor, 'keydown').pipe(map( (event:any) => {
            event.preventDefault();
            let key: string = event.key;
            return key;
        }));
        const editorKeydownObs = keydownObs.pipe(map((key: string) => {
            return {
                start: this.start_glyph_iter.clone(),
                end: this.end_glyph_iter.clone(),
                key: key
            }
        }));
        let keydownProcessor: Observable<NewActionData> = KeydownProcessor.subscribeTo(editorKeydownObs);
        let newActionObs = merge(keydownProcessor, pasteObs);
        
        let actionProcessor = ActionProcessor.subscribeTo(newActionObs);
        
        let saveProcessor = SaveProcessor.subscribeTo(actionProcessor,this.editor, this.glyphs);

        let executeProcessor = ExecuteProcessor.subscribeTo(saveProcessor, this.editor, this.glyphs);
        executeProcessor.subscribe({
            next: ( data: RenderData ) => {
                if(data.action === RenderAction.Render) {
                    this.renderer.render(data.render_start, data.render_end);
                } else if (data.action === RenderAction.Rerender) {
                    this.renderer.rerender(data.render_start, data.render_end);
                } else {
                    // No need to render, since RenderAction.None.
                }

                this.start_glyph_iter = data.cursor_start.clone();
                this.end_glyph_iter = data.cursor_end.clone();
                this.updateCursorToCurrent();
            }
        });

        let mouseDownObs = fromEvent(this.editor, 'mousedown');
        let mouseDownSub = mouseDownObs.subscribe({
            next: (event: any) => {
                // Need to collapse selection on mouse down because otherwise it breaks a bunch of other shit
                // in chrome.
                console.log(event);
                if(this.cursor.isSelection() && event.button === 2) {
                    event.preventDefault();
                    return;
                }

                if(this.cursor.isSelection()) {
                    // If is selection, start mousedown by collapsing the selection.
                    this.cursor.selection.removeAllRanges();
                }
                /*
                if(event.button === 0) {
                    if(this.cursor.isSelection()) {
                        // If is selection, start mousedown by collapsing the selection.
                        this.cursor.selection.removeAllRanges();
                    }
                } else if (event.button === 1) {
                    
                } else if (event.button === 2) {

                }*/
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
                if (event.button === 2) {
                    this.updateCursorToCurrent();                    
                }
            },
            error: (err) => {},
            complete: () => {}
        })

        let clickObs = fromEvent(this.editor, 'click');
        let clickSub = clickObs.subscribe({
            next: (event: any) => {
                console.log("CLICK");
                if(event.button === 0) {
                    this.click_handler.handle(event, this.glyphs.makeFrontIterator(), this.glyphs.makeBackIterator());
                    this._updateIteratorsFromHandler(this.click_handler);
                } else if (event.button === 1) {
                    
                } else if (event.button === 2) {

                }
                this.updateCursorToCurrent();

                    
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
