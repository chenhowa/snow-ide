

import { Observable, fromEvent } from "rxjs";
import { map } from "rxjs/operators";
import Strings from "string-map";
import { 
    moveArrow,
    isArrowKey,
    isChar
} from "editor/editor_executors/editor-utils";

import { DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";
import KeyPressMapSingleton from "editor/singletons/keypress-map-singleton";



interface KeydownActionData {
    new_start: DoubleIterator<Glyph>,
    new_end: DoubleIterator<Glyph>,
    key: string,
    start: DoubleIterator<Glyph>,
    end: DoubleIterator<Glyph>,
    action: KeydownAction
}

enum KeydownAction {
    Insert = 1,
    Backspace,
    Delete,
    Copy,
    Paste,
    Undo,
    Redo,
    None
}

interface EditorData {
    key: string;
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
    
}


let keydown_obs: Observable<KeydownActionData>;

let keypress_map = KeyPressMapSingleton.get();


let KeydownProcessor = {
    subscribeTo: function(obs: Observable<EditorData>): Observable<KeydownActionData> {
        if(!keydown_obs) {
            keydown_obs = createKeydownObservable(obs);
        }

        return keydown_obs;
    }
}

function createKeydownObservable(obs: Observable<EditorData>): Observable<KeydownActionData> {
    let keydown_obs = obs.pipe(map((data) => {
        let start_iter = data.start.clone();
        let end_iter = data.end.clone();


        let result_data: KeydownActionData;

        if(keypress_map.isControl()) {
            result_data = _handleKeyWithControl(data);
        } else {
            result_data = _handleKeyAlone(data);
        }


        return result_data;
    }));

    return keydown_obs;
}

function _handleKeyWithControl(data: EditorData)
                                    : KeydownActionData {
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
    let action: KeydownAction;
    let key = data.key;

    if(key === Strings.control.copy) {
        action = KeydownAction.Copy;
    } else if (key === Strings.control.paste) {
        action = KeydownAction.Paste
    } else if (key === Strings.control.undo) {
        action = KeydownAction.Undo;
    } else if (key === Strings.control.redo) {
        action = KeydownAction.Redo;
    } else {
        action = KeydownAction.None;
    }

    let action_data: KeydownActionData = {
        start: data.start.clone(),
        end: data.end.clone(),
        key: data.key,
        action: action,
        new_start: data.start.clone(),  // We won't change the cursor position at this point, it seems.
        new_end: data.start.clone()
    }

    return action_data;
}

function _handleKeyAlone(data: EditorData)
                    : KeydownActionData {
    let key = data.key;
    let action: KeydownAction;
    if(isChar(key)) {
        action = KeydownAction.Insert;
    } else if (key === 'Backspace') {
        action = KeydownAction.Backspace;
    } else if (key === 'Delete' ) {
        action = KeydownAction.Delete;
    } else if (key === 'Enter') {
        key = Strings.newline; // We convert the Enter key into a \n newline.
        action = KeydownAction.Insert;  
    } else if (isArrowKey(key)) {
        action = KeydownAction.None;
    } else {
        action = KeydownAction.None;
    }

    // TODO THIS IS INCORRECT. We shouldn't be telling the 
    // editor about the new iterator position yet, since the inserts
    // and deletes haven't yet happened.

    let result: KeydownActionData = {
        start: data.start.clone(),
        end: data.end.clone(),
        key: key,
        action: action,
        new_start: data.start.clone(),
        new_end: data.end.clone()
    }

    if(isArrowKey(key)) {
        let new_iters = moveArrow(data.key, data.start, data.end);
        result.new_start = new_iters[0];
        result.new_end = new_iters[1];
    }

    return result;
}

export default KeydownProcessor;
export { KeydownProcessor, KeydownAction };