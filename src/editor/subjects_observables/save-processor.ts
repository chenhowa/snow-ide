import { Observable } from "rxjs";
import { map } from "rxjs/operators";


import { DoubleIterator, LinkedList } from 'data_structures/linked-list';
import { Glyph } from "editor/glyph";

import { KeydownAction } from "editor/subjects_observables/keydown-processor";
import { SaveData, SavePolicy } from "editor/undo_redo/policies/save-policy";
import HistorySingleton from "editor/singletons/history-singleton";
import ChangeBufferSingleton from "editor/singletons/change-buffer-singleton";
import SavePolicySingleton from "editor/singletons/save-policy-singleton";
import { ChangeBuffer } from "editor/undo_redo/change-buffer";
import { AddCommand } from "editor/undo_redo/command-history";
import { ExecuteData } from "editor/subjects_observables/execute-processor";

interface SaveProcessorData {
    key: string;
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>
    action: KeydownAction,
    save_data: SaveData,
    position: DoubleIterator<Glyph>
}

let save_processor: Observable<ExecuteData>;

let SaveProcessor = {
    subscribeTo: function(obs: Observable<SaveProcessorData>, node: JQuery<HTMLElement>, 
                                                list: LinkedList<Glyph>)
                                                                        : Observable<ExecuteData> {
        if(!save_processor) {
            save_processor = createProcessor(obs, node, list);
        }
        return save_processor;
    }
}

function createProcessor(obs: Observable<SaveProcessorData>, node: JQuery<HTMLElement>, 
                                            list: LinkedList<Glyph>)
                                                                    : Observable<ExecuteData> {
    let history: AddCommand<Glyph> = HistorySingleton.get();
    let buffer: ChangeBuffer<Glyph> = ChangeBufferSingleton.get(node, list);
    let save_policy: SavePolicy = SavePolicySingleton.get();

    let processor = obs.pipe(map((data) => {
        // If necessary, save the buffer here.
        if(save_policy.shouldSave(data.save_data) && buffer.isDirty()) {
            history.add(buffer.generateAndClean());
            buffer.resetListState();
        }

        return {
            key: data.key,
            start: data.start.clone(),
            end: data.end.clone(),
            action: data.action,
            position: data.position
        }
    }));

    return processor;
}

export default SaveProcessor;
export { SaveProcessor, SaveProcessorData };