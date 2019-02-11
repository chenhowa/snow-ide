import { SavePolicy, SaveData, DeletionType } from "./save-policy";



class SwitchBackspaceDeleteSavePolicy implements SavePolicy {
    last_deletion?: DeletionType
    switched: boolean = false;

    constructor() {
        this.last_deletion = undefined;
    }

    shouldSave(data: SaveData ): boolean {
        if(data.deletion_direction) {
            if(!this.last_deletion) {
                // Then we've not done a deletion before.
                this.last_deletion = data.deletion_direction
                this.switched = false;
            } else if(data.deletion_direction === this.last_deletion) {
                // We've not switched yet.
                this.switched = false;
            } else {
                // Then we must have switched.
                this.switched = true;
                this.last_deletion = data.deletion_direction;
            }
        }

        return this.switched;
    }


    reset() {
        this.last_deletion = undefined;
        this.switched = false;
    }
}


export default SwitchBackspaceDeleteSavePolicy;