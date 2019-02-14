

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

import { Action, NewActionData } from "editor/subjects_observables/action-processor";



interface EditorData {
    key: string;
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
}


let keydown_obs: Observable<NewActionData>;

let keypress_map = KeyPressMapSingleton.get();


let KeydownProcessor = {
    subscribeTo: function(obs: Observable<EditorData>): Observable<NewActionData> {
        if(!keydown_obs) {
            keydown_obs = createKeydownObservable(obs);
        }

        return keydown_obs;
    }
}

function createKeydownObservable(obs: Observable<EditorData>): Observable<NewActionData> {
    let keydown_obs = obs.pipe(map((data) => {
        let result_data: NewActionData;

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
                                    : NewActionData {
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
    let action: Action;
    let key = data.key;

    if(key === Strings.control.copy) {
        action = Action.Copy;
    } else if (key === Strings.control.paste) {
        action = Action.None;
        console.log('exec paste');
        document.execCommand('paste');
    } else if (key === Strings.control.undo) {
        action = Action.Undo;
    } else if (key === Strings.control.redo) {
        action = Action.Redo;
    } else {
        action = Action.None;
    }

    let action_data: NewActionData = {
        start: data.start.clone(),
        end: data.end.clone(),
        key: data.key,
        action: action
    }

    return action_data;
}

function _handleKeyAlone(data: EditorData)
                    : NewActionData {
    let key = data.key;
    let action: Action;
    if(isChar(key)) {
        action = Action.Insert;
    } else if (key === 'Backspace') {
        action = Action.Backspace;
    } else if (key === 'Delete' ) {
        action = Action.Delete;
    } else if (key === 'Enter') {
        key = Strings.newline; // We convert the Enter key into a \n newline.
        action = Action.Insert;  
    } else if (isArrowKey(key)) {
        action = Action.ArrowKey;
    } else {
        action = Action.None;
    }

    // TODO THIS IS INCORRECT. We shouldn't be telling the 
    // editor about the new iterator position yet, since the inserts
    // and deletes haven't yet happened.

    let result: NewActionData = {
        start: data.start.clone(),
        end: data.end.clone(),
        key: key,
        action: action
    }

    return result;
}

export default KeydownProcessor;
export { KeydownProcessor, EditorData };