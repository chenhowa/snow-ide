import { SavePolicy } from "./save-policy";
import { SaveData } from "./save-policies";
import { Action } from "editor/subjects_observables/action-processor";



class ActionSavePolicy implements SavePolicy {

    constructor() {

    }

    shouldSave(data: SaveData): boolean {
        switch(data.action) {
            case Action.Undo: {
                return true;
            } break;
            case Action.Redo: {
                return true;
            } break;
            case Action.Copy: {
                return true;
            } break;
            case Action.Paste: {
                return true;
            } break;
            default: {
                return false;
            }
        }
    }

    reset() {

    }
}

export default ActionSavePolicy;