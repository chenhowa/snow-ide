import { SavePolicy, SaveData, EditorActionType } from "./save-policy";



class SwitchInsertDeleteSavePolicy implements SavePolicy {

    was_switched: boolean = false;
    last_action?: EditorActionType;

    constructor() {
        this.last_action = undefined;
    }

    /**
     * @description - This works by remembering the last action that occurred, whether insert or delete.
     * @param data 
     */
    shouldSave(data: SaveData): boolean {
        if(data && data.editor_action) {
            if(!this.last_action) {
                this.was_switched = false;
                this.last_action = data.editor_action;
            }
            else if(data.editor_action === this.last_action) {
                this.was_switched = false;
            } else {
                this.was_switched = true;
            }
        }

        return this.was_switched;
    }

    reset() {
        this.was_switched = false;
        this.last_action = undefined;
    }
}

export default SwitchInsertDeleteSavePolicy;