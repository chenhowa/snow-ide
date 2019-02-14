import {
    isChar,
    isArrowKey
} from "editor/editor_executors/editor-utils";


import { SavePolicy, SaveData, EditorActionType } from "editor/undo_redo/policies/save-policy";

import KeypressMapSingleton from "editor/singletons/keypress-map-singleton";

import Strings from "string-map";


/**
 * @description - Saves based on the current key passed to it. Maintains no state.
 */
class CurrentKeySavePolicy implements SavePolicy {
    constructor() {

    }

    shouldSave(data: SaveData): boolean {
        if(data && data.key) {
            let press_map = KeypressMapSingleton.get();
            if(press_map.isControl()) {
                return this._shouldSaveIfControl(data.key);
            } else if (isArrowKey(data.key)) {
                return true;
            }
        }

        return false;
    }

    _shouldSaveIfControl(key: string): boolean {
        let should_save = false;
        switch(key) {
            case Strings.control.paste: should_save = true; // should save before paste.
            break;  
            case Strings.control.undo: should_save = true;  // should save before undo (you are undoing what you just did)
            break;
            case Strings.control.redo: should_save = true;  /* should save before redo (if you undid 5 things and then started typing, 
                                                            redo should overwite your old history )*/
            break;
            case Strings.control.copy: should_save = true;
            break;
            default:    should_save = false;
        }

        return should_save;
    }


    reset() {
        // Nothing. No state to reset.
    }
}

export default CurrentKeySavePolicy;