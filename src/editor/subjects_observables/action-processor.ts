import { Observable, from } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import Strings from "string-map";

import { DoubleIterator } from 'data_structures/linked-list';
import { Glyph } from "editor/glyph";
import { KeydownAction } from "editor/subjects_observables/keydown-processor-observable";
import { SaveData, EditorActionType, DeletionType } from "editor/undo_redo/policies/save-policy";

interface NewActionData {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
    action: KeydownAction;
    key: string;
}

interface SaveProcessorData {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>
    action: KeydownAction,
    save_data: SaveData,
    position: DoubleIterator<Glyph>
}



let action_processor: Observable<SaveProcessorData>;

let ActionProcessor = {
    subscribeTo: function(obs: Observable<NewActionData>): Observable<SaveProcessorData> {
        if(!action_processor) {
            action_processor = createProcessor(obs);
        }
        return action_processor;
    }
};

/**
 * @todo we need to map each data, which consists of 1 insert action plus two start and end iterators,
 *       to an observable of arrays. Then we will merge those observables together into just one stream of SaveProcessorData.
 * @param obs 
 */
function createProcessor(obs: Observable<NewActionData>): Observable<SaveProcessorData> {
    let action_processor = obs.pipe(mergeMap((data) => {
        let start = data.start.clone();
        let end = data.end.clone();
        switch(data.action) {
            case KeydownAction.Insert: {
                let processor_data: Array<SaveProcessorData> = [];

                // Create delete messages targeting everyone who is occupying the space to be inserted into.
                if(!start.equals(end)) {
                    while(!start.equals(end) && start.hasNext()) {
                        start.next();
                        if(start.equals(end)) {
                            break;
                        } else {
                            processor_data.push({
                                start: data.start.clone(),
                                end: data.end.clone(),
                                action: KeydownAction.Delete,
                                position: start.clone(),
                                save_data: {
                                    editor_action: EditorActionType.Remove,
                                    deletion_direction: DeletionType.Backward
                                }
                            });
                        }
                    }

                    // Then create the insert message.
                    processor_data.push({
                        start: data.start.clone(),
                        end:data.end.clone(),
                        action: KeydownAction.Delete,
                        position: end.clone(),
                        save_data: {
                            editor_action: EditorActionType.Remove,
                            deletion_direction: DeletionType.Backward
                        }
                    })
                }
                

                if(!start.equals(end)) {
                    throw new Error("ActionProcessor createProcessor: somehow start !== end");
                }
                
                processor_data.push({
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: data.action,
                    position: end.clone(), // we are indeed inserting right where we are.
                    save_data: {
                        key: data.key,
                        editor_action: EditorActionType.Insert
                    }
                });

                return from(processor_data);

            } break;
            case KeydownAction.Backspace: {
                
            } break;
            case KeydownAction.Delete: {
               
            } break;
            case KeydownAction.Copy: {
                return from([{
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: data.action,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key   
                    }
                }]);
            } break;
            case KeydownAction.Paste: {
                return from([{
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: data.action,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key   
                    }
                }]);
            } break;
            case KeydownAction.Undo: {
                return from([{
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: data.action,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key   
                    }
                }]);
            } break;
            case KeydownAction.Redo: {
                return from([{
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: data.action,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key   
                    }
                }]);
            } break;
            case KeydownAction.None: {
                return from([{
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: data.action,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key
                    }
                }]);
            } break;
            default: {
                throw new Error("Unhandled KeydownAction in ActionProcessor: " + data.action);
            }
        }
    }));

    return action_processor;
}


export default ActionProcessor;
export { NewActionData };