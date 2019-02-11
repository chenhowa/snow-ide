

import { Observable, fromEvent } from "rxjs";
import { map } from "rxjs/operators";
import Strings from "string-map";
import { isChar, isArrowKey } from "editor/editor_executors/editor-utils";

import { SaveData } from "editor/undo_redo/policies/save-policies";
import { BufferData } from "editor/subscriptions/change-buffer-execute-sub";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";
import HistorySingleton from "editor/singletons/history-singleton";
import KeyPressMapSingleton from "editor/singletons/keypress-map-singleton";
import { EditorExecutor } from "editor/editor_executors/editor-executor";


interface ResultData extends SaveData, BufferData {
    new_start: DoubleIterator<Glyph>
    new_end: DoubleIterator<Glyph>
}

interface EditorData {
    key: string;
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
    
}


let keydown_obs: Observable<ResultData>;

let keypress_map = KeyPressMapSingleton.get();

let command_history = HistorySingleton.get();

function createKeydownObservable(obs: Observable<EditorData>, executor: EditorExecutor) {
    let keydown_obs = obs.pipe(map((data) => {
        let start_iter = data.start.clone();
        let end_iter = data.end.clone();


        let new_iters: Array<DoubleIterator<Glyph>>;

        if(keypress_map.isControl()) {
            new_iters = _handleKeyWithControl(event, data.key, start_iter, end_iter);
        } else {
            new_iters = _handleKeyAlone(event, data.key, start_iter, end_iter);
        }

        let result_data: ResultData = {
            key: data.key,
            collapse_direction: 0,
            decrement_start: false,
            increment_end: false,
            reset: false,
            new_start: new_iters[0],
            new_end: new_iters[1]
        }

        return result_data;
    }));

    return keydown_obs;
}

function _handleKeyWithControl(event: any, key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                    : Array<DoubleIterator<Glyph>> {
    /* So what might happen here?
        1. Copy.
        2. Paste.
        3. Undo.
        4. Redo

        In the case of copy, nothing needs to happen with regards to where the cursor is.
        In the case of paste, we have all info we need (the current cursor) to figure out where the cursor should be next.
        But in the case of undo and redo, WE DO NOT. Each command technically knows where it ends up. So commands should 
        return a CommandResult object or something, or they should get a reference to the editor, so we can know how
        to set the resulting state. For now we'll go with returning a command object.
    */
    let iterator_array = [source_start_iter.clone(), source_end_iter.clone()];

    if(key === Strings.control.copy) {

    } else if (key === Strings.control.paste) {

    } else if (key === Strings.control.undo) {
        let result = command_history.undo();
        iterator_array[0] = result.start_iter ? result.start_iter : iterator_array[0];
        iterator_array[1] = result.end_iter ? result.end_iter : iterator_array[1];

    } else if (key === Strings.control.redo) {
        let result = command_history.do();
        iterator_array[0] = result.start_iter ? result.start_iter : iterator_array[0];
        iterator_array[1] = result.end_iter ? result.end_iter : iterator_array[1];
    } else {
        console.log("UNHANDLED KEY WITH CONTROL");
    }

    return iterator_array;
}

function _handleKeyAlone(event: any, key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                    : Array<DoubleIterator<Glyph>> {
        
    let start_iter = source_start_iter.clone();
    let end_iter = source_end_iter.clone();
    event.preventDefault();

    if(isChar(key)) {
        return this.executor.insertAndRender(key, start_iter, end_iter);
    } else if (key === 'Backspace') {
        return this.executor.deleteAndRender(start_iter, end_iter, false); // deletes 'backward'
    } else if (key === 'Delete' ) {
        return this.executor.deleteAndRender(start_iter, end_iter, true); // deletes 'forward'
    } else if (key === 'Enter') {
        return this.executor.insertAndRerender(Strings.newline, source_start_iter, source_end_iter);  
    } else if (isArrowKey(key)) {
        return this._handleArrowKey(key, start_iter, end_iter);
    } else {
        console.log("UNHANDLED KEY " + key);
    }

    return [start_iter.clone(), end_iter.clone()];
}


let KeydownObservable = {
    get: function(obs: Observable<EditorData>, executor: EditorExecutor): Observable<ResultData> {
        if(!keydown_obs) {
            keydown_obs = createKeydownObservable(obs, executor);
        }

        return keydown_obs;
    }
}

export default KeydownObservable;