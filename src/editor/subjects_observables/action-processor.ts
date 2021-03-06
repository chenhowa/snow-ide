import { Observable, from, merge } from "rxjs";
import { mergeMap } from "rxjs/operators";
import Strings from "string-map";

import { DoubleIterator } from 'data_structures/linked-list';
import { Glyph } from "editor/glyph";
import { SaveData, EditorActionType, DeletionType } from "editor/undo_redo/policies/save-policy";

import { SaveProcessorData, ExecuteAction } from "editor/subjects_observables/save-processor";

interface NewActionData {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
    action: Action;
    key: string;
}

enum Action {
    Insert = 1,
    Backspace,
    Delete,
    Copy,
    Paste,
    Undo,
    Redo,
    ArrowKey,
    None
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
            case Action.Insert: {
                return generateInsertObservable(start, end, data);
            } break;
            case Action.Backspace: {
                return generateRemoveObservable(start, end, data, true);
            } break;
            case Action.Delete: {
                return generateRemoveObservable(start, end, data, true);
            } break;
            case Action.Copy: {
                return from([{
                    key: data.key,
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: ExecuteAction.Copy,
                    position: start.clone(),
                    save_data: {
                        key: data.key,
                        action: data.action   
                    },
                    complete: true
                }]);
            } break;
            case Action.Paste: {
                return generatePasteObservable(start, end, data, data.key);
            } break;
            case Action.Undo: {
                return from([{
                    key: data.key,
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: ExecuteAction.Undo,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key,
                        action: data.action   
                    },
                    complete: true
                }]);
            } break;
            case Action.Redo: {
                return from([{
                    key: data.key,
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: ExecuteAction.Redo,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key,
                        action: data.action
                    },
                    complete: true
                }]);
            } break;
            case Action.None: {
                return from([{
                    key: data.key,
                    start: data.start.clone(),
                    end: data.end.clone(),
                    action: ExecuteAction.None,
                    position: data.start.clone(),
                    save_data: {
                        key: data.key,
                        action: data.action
                    },
                    complete: true
                }]);
            } break;
            case Action.ArrowKey: {
                return from([{
                    key: data.key,
                    start: data.start.clone(),
                    end: data.end.clone(),
                    position: data.start.clone(),
                    action: ExecuteAction.ArrowKey,
                    save_data: {
                        key: data.key,
                        action: data.action
                    },
                    complete: true
                }]);
            } break;
            default: {
                throw new Error("Unhandled Action in ActionProcessor: " + data.action);
            }
        }
    }));

    return action_processor;
}

function generateRemoveObservable(source_start: DoubleIterator<Glyph>, 
                                    source_end: DoubleIterator<Glyph>, data: NewActionData, complete: boolean) 
                                                                : Observable<SaveProcessorData> {
    let start = source_start.clone();
    let end = source_end.clone();

    if(data.action !== Action.Backspace && data.action!== Action.Delete) {
        throw new Error("generateRemoveObservable called without backspace or delete action");
    }

    let is_backspace = data.action === Action.Backspace;

    let processor_data: Array<SaveProcessorData> = [];

    let action = is_backspace ? ExecuteAction.Backspace : ExecuteAction.Delete;
    let deletion_direction = is_backspace ? DeletionType.Backward : DeletionType.Forward;

    if(!start.equals(end)) {
        // Generate mass remove.
        processor_data.push({
            key: data.key,
            start: data.start.clone(),
            end: data.end.clone(),
            action: ExecuteAction.MassRemove,
            position: start.clone(),
            save_data: {
                editor_action: EditorActionType.Remove,
                deletion_direction: deletion_direction,
                action: data.action
            },
            complete: complete
        })

    } else {
        processor_data.push({
            key: data.key,
            start: data.start.clone(),
            end: data.end.clone(),
            action: action,
            position: start.clone(),
            save_data: {
                editor_action: EditorActionType.Remove,
                deletion_direction: deletion_direction,
                action: data.action
            },
            complete: true
        })
    }

    return from(processor_data);
}

function generateInsertObservable(source_start: DoubleIterator<Glyph>, 
                                    source_end: DoubleIterator<Glyph>, data: NewActionData) 
                                                                    : Observable<SaveProcessorData> {
    let start = source_start.clone();
    let end = source_end.clone();

    if(data.action !== Action.Insert) {
        throw new Error("generateInsertObservable called without Action.Insert");
    }

    // Create delete messages targeting everyone who is occupying the space to be inserted into.
    let deleteObservable: Observable<SaveProcessorData> = from([]);
    if(!start.equals(end)) {
        let delete_data: NewActionData = {
            start: start.clone(),
            end: end.clone(),
            key: data.key,
            action: Action.Backspace
        }
        deleteObservable = generateRemoveObservable(start, end, delete_data, false);
    }

    let insertObservable: Observable<SaveProcessorData> = from([{
        key: data.key,
        start: data.start.clone(),
        end: data.end.clone(),
        action: ExecuteAction.Insert,
        position: start.clone(), // we insert right after the start position.
        save_data: {
            key: data.key,
            editor_action: EditorActionType.Insert,
            action: data.action
        },
        complete: true
    }]);
    return merge(deleteObservable, insertObservable);
}

function generatePasteObservable(source_start: DoubleIterator<Glyph>, 
                source_end: DoubleIterator<Glyph>, data: NewActionData, text: string)
                                                            : Observable<SaveProcessorData> {
    let start = source_start.clone();
    let end = source_end.clone();
    let deleteObservable: Observable<SaveProcessorData> = from([]);
    if(!start.equals(end)) {
        let delete_data: NewActionData = {
            start: start.clone(),
            end: end.clone(),
            key: data.key,
            action: Action.Backspace
        }
        deleteObservable = generateRemoveObservable(start, end, delete_data, false);
    }
    
    let observables: Array<SaveProcessorData> = [];
    observables.push({
        key: text,
        start: data.start.clone(),
        end: data.end.clone(),
        action: ExecuteAction.MassInsert,
        position: data.start.clone(),
        save_data: {
            editor_action: EditorActionType.Insert, // mass insert is still an insert.
            action: data.action
        },
        complete: true
    });

    return merge(deleteObservable, from(observables));
}

export default ActionProcessor;
export { NewActionData, Action };