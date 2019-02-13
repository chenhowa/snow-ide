import { SavePolicy, SaveData } from "editor/undo_redo/policies/save-policies";
import { isChar, isSpace } from "editor/editor_executors/editor-utils";



class SwitchCharSpaceSavePolicy implements SavePolicy {
    switched: boolean = false;
    was_char?: boolean;

    constructor() {
        this.was_char = undefined;
    }

    shouldSave(data: SaveData): boolean {
        this.switched = false;
        if(data.key) {
            if(isSpace(data.key)) {
                if(this.was_char) {
                    this.switched = true;
                } 
                    
                this.was_char = false;
            } else if ( isChar(data.key) && !isSpace(data.key) ) {
                this.was_char = true;
            }
        }

        return this.switched;
    }

    reset() {
        this.was_char = undefined;
        this.switched = false;
    }
}

export default SwitchCharSpaceSavePolicy;