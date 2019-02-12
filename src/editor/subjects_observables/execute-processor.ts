import { Observable, from } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import Strings from "string-map";

import { DoubleIterator, LinkedList } from 'data_structures/linked-list';
import { Glyph, GlyphStyle } from "editor/glyph";

import { KeydownAction } from "editor/subjects_observables/keydown-processor";

import HistorySingleton from "editor/singletons/history-singleton";
import { History } from "editor/undo_redo/command-history";
import { ChangeBuffer, ChangeTracker } from "editor/undo_redo/change-buffer";
import ChangeBufferSingleton from "editor/singletons/change-buffer-singleton";


interface ExecuteData {
    key: string,
    start: DoubleIterator<Glyph>,
    end: DoubleIterator<Glyph>
    action: KeydownAction,
    position: DoubleIterator<Glyph>
}


interface RenderData {
    start: DoubleIterator<Glyph>,
    end: DoubleIterator<Glyph>,
    action: RenderAction
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
            start: data.start.clone(),
            end: data.end.clone()
        }

        let history: History<Glyph> = HistorySingleton.get();
        let buffer: ChangeBuffer<Glyph> & ChangeTracker<Glyph> = ChangeBufferSingleton.get(node, list);
        let willEditText: boolean = data.action === KeydownAction.Insert 
                                ||  data.action === KeydownAction.Backspace
                                ||  data.action === KeydownAction.Delete;
        
        if(willEditText && buffer.isDirty()) {
            // Then we anchor ourselves to the proposed start and end positions;
            buffer.setStartAnchor(data.start); // anchor one before the selected text.
            let end = data.end.clone();
            end.next();
            buffer.setEndAnchor(end); // anchor one after the selected text.
        }

        let position = data.position.clone();

        switch(data.action) {
            case KeydownAction.Insert: {
                // We just...insert.
                position.insertAfter(new Glyph(data.key, new GlyphStyle()));
                position.next();
                if(data.key === Strings.newline) {
                    // If it was a newline, we rerender. Otherwise we just render.
                    return {
                        start: position.clone(),
                        end: position.clone(),
                        action: RenderAction.Rerender
                    }
                } else {
                    return {
                        start: position.clone(),
                        end: position.clone(),
                        action: RenderAction.Render
                    }
                }
            } break;
            case KeydownAction.Backspace: {
                if(data.start.equals(data.end)) {
                    // If this delete was occuring from collapsed cursor.
                    buffer.decrementStartAnchor();
                }
                if(position.isValid() && position.hasPrev()) {
                    position.remove(false).caseOf({
                        just: (node) => {
                            buffer.addToBufferStart(node);
                        },
                        nothing: () => { new Error("ExecuteProcessor: backspace on empty node" ); }
                    })
                } else {
                    // Otherwise don't delete. We don't delete the first newline.
                }

                return {
                    start: position.clone(),
                    end: position.clone(),
                    action: RenderAction.Rerender
                }
            } break;
            case KeydownAction.Delete: {
                if(data.start.equals(data.end)) {
                    // if this delete was occurring from collapsed cursor
                    buffer.incrementEndAnchor();
                }
                if(position.hasNext()) {
                    position.removeNext().caseOf({
                        just: (node) => {
                            buffer.addToBufferEnd(node);
                        },
                        nothing: () => { throw new Error('ExecuteProcessor: Tried to delete empty node') }
                    })
                }

                return {
                    start: position.clone(),
                    end: position.clone(),
                    action: RenderAction.Rerender
                }
            } break;
            case KeydownAction.Copy: {
                // TODO: COPYING IS JUST PULLING FROM THE RANGE INTO THE CLIPBOARD
                return no_render;
            } break;
            case KeydownAction.Paste: {
                // TODO: DOES NOT BELONG. PASTING IS DELETING AND THEN INSERTING.
                return no_render;
            } break;
            case KeydownAction.Undo: {
                history.undo(); // This will render on its own.
                return no_render;
            } break;
            case KeydownAction.Redo: {
                history.do();   // This will render on its own.
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

