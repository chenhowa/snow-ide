

import { SavePolicy, SaveData } from "editor/undo_redo/policies/save-policy";


class CompositeSavePolicy implements SavePolicy {
    policies: Array<SavePolicy>

    constructor(policies: Array<SavePolicy>) {
        this.policies = policies;
    }


    shouldSave(data?: SaveData): boolean {
        let should_save = false;
        for(let i = 0; i < this.policies.length; i++) {
            should_save = should_save || this.policies[i].shouldSave(data);
        }

        return should_save;
    }

    // The caller determines whether to reset the save policies.
    reset(): void {
        for(let i = 0; i < this.policies.length; i++) {
            this.policies[i].reset();
        }
    }
}

export default CompositeSavePolicy;