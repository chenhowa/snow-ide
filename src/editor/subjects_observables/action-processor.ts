import { Observable, from } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import Strings from "string-map";

import { DoubleIterator } from 'data_structures/linked-list';
import { Glyph } from "editor/glyph";
import { KeydownAction } from "editor/subjects_observables/keydown-processor";
import { SaveData, EditorActionType, DeletionType } from "editor/undo_redo/policies/save-policy";

import { SaveProcessorData } from "editor/subjects_observables/save-processor";

interface NewActionData {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
    action: KeydownAction;
    key: string;
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
                                key: data.key,
                                start: data.start.clone(),
                                end: data.end.clone(),
                                action: KeydownAction.Backspace,
                                position: start.clone(),
                                save_data: {
                                    editor_action: EditorActionType.Remove,
                                    deletion_direction: DeletionType.Backward
                                }
                            });
                        }
                    }

                    // Delete the final character.
                    processor_data.push({
                        key: data.key,
                        start: data.start.clone(),
                        end:data.end.clone(),
                        action: KeydownAction.Backspace,
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
                    key: data.key,
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
                let processor_data = [];
                while(!start.equals(end) && start.hasNext()) {
                    start.next();
                    if(start.equals(end)) {
                        break;
                    } else {
                        processor_data.push({
                            key: data.key,
                            start: data.start.clone(),
                            end: data.end.clone(),
                            action: KeydownAction.Backspace,
                            position: start.clone(),
                            save_data: {
                                editor_action: EditorActionType.Remove,
                                deletion_direction: DeletionType.Backward
                            }
                        });
                    }
                }

                // Delete the final character.
                processor_data.push({
                    key: data.key,
                    start: data.start.clone(),
                    end:data.end.clone(),
                    action: KeydownAction.Backspace,
                    position: end.clone(),
                    save_data: {
                        editor_action: EditorActionType.Remove,
                        deletion_direction: DeletionType.Backward
                    }
                });

                return from(processor_data);
                
            } break;
            case KeydownAction.Delete: {
                let processor_data = [];
                while(!start.equals(end) && start.hasNext()) {
                    start.next();
                    if(start.equals(end)) {
                        break;
                    } else {
                        processor_data.push({
                            key: data.key,
                            start: data.start.clone(),
                            end: data.end.clone(),
                            action: KeydownAction.Delete,
                            position: start.clone(),
                            save_data: {
                                editor_action: EditorActionType.Remove,
                                deletion_direction: DeletionType.Forward
                            }
                        });
                    }
                }

                // Delete the final character.
                processor_data.push({
                    key: data.key,
                    start: data.start.clone(),
                    end:data.end.clone(),
                    action: KeydownAction.Delete,
                    position: end.clone(),
                    save_data: {
                        editor_action: EditorActionType.Remove,
                        deletion_direction: DeletionType.Forward
                    }
                });

                return from(processor_data);
            } break;
            case KeydownAction.Copy: {
                return from([{
                    key: data.key,
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
                    key: data.key,
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
                    key: data.key,
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
                    key: data.key,
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
                    key: data.key,
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