


import { SavePolicy, SaveData } from "editor/undo_redo/policies/save-policy";

import KeypressMapSingleton from "editor/singletons/keypress-map-singleton";

import Strings from "string-map";


class KeycodeSavePolicy implements SavePolicy {
    constructor() {

    }

    shouldSave(data?: SaveData): boolean {
        if(data && data.key) {
            let press_map = KeypressMapSingleton.get();
            if(press_map.isControl()) {
                return this._shouldSaveIfControl(data.key);
            }
        }

        return false;
    }

    _shouldSaveIfControl(key: string): boolean {
        switch(key) {
            case Strings.control.paste: return true;  // should save before paste.
            case Strings.control.undo: return true;  // should save before undo (you are undoing what you just did)
            case Strings.control.redo: return true;  /* should save before redo (if you undid 5 things and then started typing, 
                                                            redo should overwite your old history )*/
            case Strings.control.copy: return true; 
            default:    return false;
        }
    }


    reset() {
        // Nothing. No state to reset.
    }
}

export default KeycodeSavePolicy;