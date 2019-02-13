import { Observable, from } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import Strings from "string-map";
import $ from "jquery";

import { DoubleIterator, LinkedList } from 'data_structures/linked-list';
import { Glyph, GlyphStyle } from "editor/glyph";

import { ExecuteAction } from "editor/subjects_observables/save-processor";

import HistorySingleton from "editor/singletons/history-singleton";
import { History } from "editor/undo_redo/command-history";
import { ChangeBuffer, ChangeTracker } from "editor/undo_redo/change-buffer";
import ChangeBufferSingleton from "editor/singletons/change-buffer-singleton";
import { moveArrow } from "editor/editor_executors/editor-utils";


interface ExecuteData {
    key: string,
    start: DoubleIterator<Glyph>,
    end: DoubleIterator<Glyph>
    action: ExecuteAction,
    position: DoubleIterator<Glyph>,
    complete: boolean
}


interface RenderData {
    render_start: DoubleIterator<Glyph>,
    render_end: DoubleIterator<Glyph>,
    action: RenderAction,
    cursor_start: DoubleIterator<Glyph>,
    cursor_end: DoubleIterator<Glyph>
}

enum RenderAction {
    Render = 1,
    Rerender,
    None
}

let execute_processor: Observable<RenderData>;

let ExecuteProcessor = {
    subscribeTo: function(obs: Observable<ExecuteData>, 
                                node: JQuery<HTMLElement>, list: LinkedList<Glyph> )
                                                                    : Observable<RenderData> {
        if(!execute_processor) {
            execute_processor = createProcessor(obs, node, list);
        }

        return execute_processor;
    }
}

function createProcessor(obs: Observable<ExecuteData>, 
                                        node: JQuery<HTMLElement>, list: LinkedList<Glyph>)
                                                                            : Observable<RenderData> {
    let processor = obs.pipe(map((data: ExecuteData) => {
        let no_render: RenderData = {
            action: RenderAction.None,
            render_start: data.start.clone(),
            render_end: data.end.clone(),
            cursor_start: data.start.clone(),
            cursor_end: data.end.clone()
        }

        let history: History<Glyph> = HistorySingleton.get();
        let buffer: ChangeBuffer<Glyph> & ChangeTracker<Glyph> = ChangeBufferSingleton.get(node, list);
        let willEditText: boolean = data.action === ExecuteAction.Insert 
                                ||  data.action === ExecuteAction.Backspace
                                ||  data.action === ExecuteAction.Delete
                                ||  data.action === ExecuteAction.MassInsert
                                ||  data.action === ExecuteAction.MassRemove;
        
        if(willEditText && !buffer.isDirty()) {
            // Then we anchor ourselves to the proposed start and end positions;
            buffer.setStartAnchor(data.start); // anchor one before the selected text.
            let end = data.end.clone();
            end.next();
            buffer.setEndAnchor(end); // anchor one after the selected text.
        }

        let position = data.position.clone();

        switch(data.action) {
            case ExecuteAction.Insert: {
                // We just...insert. Always collapse to end now if buffer has been set.
                if(buffer.isDirty()) {
                    buffer.collapseToEnd();
                }
                
                position.insertAfter(new Glyph(data.key, new GlyphStyle()));
                position.next();
                if(data.key === Strings.newline) {
                    // If it was a newline, we rerender. Otherwise we just render.
                    let new_data: RenderData =  {
                        render_start: position.clone(),
                        render_end: position.clone(),
                        action: data.complete ? RenderAction.Rerender : RenderAction.None,
                        cursor_start: position.clone(),
                        cursor_end: position.clone()
                    }
                    return new_data;
                } else {
                    let new_data: RenderData = {
                        render_start: position.clone(),
                        render_end: position.clone(),
                        action: data.complete ? RenderAction.Render : RenderAction.None,
                        cursor_start: position.clone(),
                        cursor_end: position.clone()
                    }
                    return new_data;
                }
            } break;
            case ExecuteAction.Backspace: {
                if(buffer.isDirty()) {
                    buffer.collapseToEnd();
                }

                if(data.start.equals(data.end)) {
                    // If this delete was occuring from collapsed cursor.
                    buffer.decrementStartAnchor();
                }
                if(position.isValid() && position.hasPrev()) {
                    position.remove(false).caseOf({
                        just: (listnode) => {
                            listnode.data.caseOf({
                                just: (glyph) => {
                                    glyph.destroyNode();
                                },
                                nothing: () => { 
                                    throw new Error ("ExecuteProcessor: No glyph in removed list node");
                                }
                            });
                            buffer.addToBufferStart(listnode);
                        },
                        nothing: () => { new Error("ExecuteProcessor: backspace on empty node" ); }
                    })
                } else {
                    // Otherwise don't delete. We don't delete the first newline.
                }

                let action: RenderAction;
                if( data.key === Strings.newline && data.complete) {
                    action = RenderAction.Rerender;
                } else {
                    action = RenderAction.None;
                }

                let new_data: RenderData = {
                    render_start: position.clone(),
                    render_end: position.clone(),
                    action: action,
                    cursor_start: position.clone(),
                    cursor_end: position.clone()
                }
                return new_data;
            } break;
            case ExecuteAction.Delete: {
                if(buffer.isDirty()) {
                    buffer.collapseToStart();
                }

                if(data.start.equals(data.end)) {
                    // if this delete was occurring from collapsed cursor
                    buffer.incrementEndAnchor();
                }
                if(position.hasNext()) {
                    position.removeNext().caseOf({
                        just: (listnode) => {
                            listnode.data.caseOf({
                                just: (glyph) => {
                                    glyph.destroyNode();
                                },
                                nothing: () => { 
                                    throw new Error ("ExecuteProcessor: No glyph in removed list node");
                                }
                            });
                            buffer.addToBufferEnd(listnode);
                        },
                        nothing: () => { throw new Error('ExecuteProcessor: Tried to delete empty node') }
                    })
                }

                let action: RenderAction;
                if( data.key === Strings.newline && data.complete) {
                    action = RenderAction.Rerender;
                } else {
                    action = RenderAction.None;
                }

                let new_data: RenderData = {
                    render_start: position.clone(),
                    render_end: position.clone(),
                    action: action,
                    cursor_start: position.clone(),
                    cursor_end: position.clone()
                }
                return new_data;

            } break;
            case ExecuteAction.MassInsert: {
                let iter = data.start.clone();
                for(let i = 0; i < data.key.length; i++) {
                    iter.insertAfter(new Glyph(data.key[i], new GlyphStyle()));
                    iter.next();
                }

                let new_data: RenderData = {
                    render_start: data.start.clone(),
                    render_end: data.end.clone(),
                    action: RenderAction.Rerender,
                    cursor_start: iter.clone(),
                    cursor_end: iter.clone()
                }
                return new_data;
            } break;
            case ExecuteAction.MassRemove: {
                console.log("MASS REMOVING");
                let start = data.start.clone();
                let end = data.end.clone();

                let reached_end = false;
                while(start.hasNext() && !reached_end) {
                    start.next();
                    reached_end = start.equals(end);

                    start.remove(false).caseOf({
                        just: (listnode) => {
                            listnode.data.caseOf({
                                just: (glyph) => {
                                    glyph.destroyNode();
                                },
                                nothing: () => {}
                            })
                            buffer.addToBufferEnd(listnode);
                        },
                        nothing: () => { 
                            throw new Error("ExecuteProcessor: Tried to mass remove but got no node");
                        }
                    });
                }

                let new_data: RenderData = {
                    render_start: start.clone(),
                    render_end: start.clone(),
                    cursor_start: start.clone(),
                    cursor_end: start.clone(),
                    action: RenderAction.Rerender
                }

                return new_data;
            } break;
            case ExecuteAction.ArrowKey: {
                let new_iters = moveArrow(data.key, data.start, data.end);
                let new_data: RenderData = {
                    render_start: position.clone(),
                    render_end: position.clone(),
                    action: RenderAction.Rerender,
                    cursor_start: new_iters[0],
                    cursor_end: new_iters[1]

                }
                return new_data;
            } break;
            case ExecuteAction.Copy: {
                // TODO: COPYING IS JUST PULLING FROM THE RANGE INTO THE CLIPBOARD
                return no_render;
            } break;
            case ExecuteAction.Undo: {
                let result = history.undo(); 
                let renderData: RenderData = {
                    render_start: data.start.clone(),
                    render_end: data.start.clone(),
                    action: RenderAction.None,
                    cursor_start: result.start_iter ? result.start_iter.clone() : data.start.clone(),
                    cursor_end: result.end_iter ? result.end_iter.clone() : data.end.clone()
                } 

                return renderData;
            } break;
            case ExecuteAction.Redo: {
                let result = history.do();
                let renderData: RenderData = {
                    render_start: data.start.clone(),
                    render_end: data.start.clone(),
                    action: RenderAction.None,
                    cursor_start: result.start_iter ? result.start_iter.clone() : data.start.clone(),
                    cursor_end: result.end_iter ? result.end_iter.clone() : data.end.clone()
                } 
                return renderData;
            } break;
            case ExecuteAction.None: {
                return no_render;
            } break;
            default: {
                throw new Error("ExecuteProcessor: unhandled action " + data.action);
            }
        }
    }));

    return processor;
}


export default ExecuteProcessor;
export { ExecuteProcessor, ExecuteData, RenderData, RenderAction };

