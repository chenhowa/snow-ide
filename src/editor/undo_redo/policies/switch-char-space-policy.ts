import { SavePolicy, SaveData } from "editor/undo_redo/policies/save-policies";
import { isChar, isSpace } from "editor/editor_executors/editor-utils";



class SwitchCharSpaceSavePolicy implements SavePolicy {
    switched: boolean = false;
    was_char?: boolean;

    constructor() {
        this.was_char = undefined;
    }

    shouldSave(data: SaveData): boolean {
        if(data.key) {
            console.log("key");
            let is_char = isChar(data.key);
            let is_space = isSpace(data.key);
            if( is_space ) {
                if(this.was_char === undefined) {
                    this.was_char = false;
                    this.switched = false;
                } else {
                    this.switched = this.was_char === is_space;
                    this.was_char = false;
                }
            } else if (is_char) {
                if(this.was_char === undefined) {
                    this.was_char = true;
                    this.switched = false;
                } else {
                    this.switched = this.was_char !== is_char;
                    this.was_char = true;
                }
            } else {
                console.log(" not char or space");
                // Do nothing. We can't say we switched if the key wasn't even a char or a space key.
            }
        } else {
            console.log("no key");
            // Do nothing. We can't say we switched if we didn't even get any key data.
        }

        console.log("switched was : " + this.switched);

        return this.switched;
    }

    reset() {
        this.was_char = undefined;
        this.switched = false;
    }
}

export default SwitchCharSpaceSavePolicy;