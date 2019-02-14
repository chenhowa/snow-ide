

import { SavePolicy, SaveData, SetPolicies } from "editor/undo_redo/policies/save-policy";


class CompositeSavePolicy implements SavePolicy, SetPolicies {
    policies: Array<SavePolicy>

    constructor(policies: Array<SavePolicy>) {
        this.policies = policies;
    }

    // TODO - if you can remove policies, than to remove memory leaks,
    // we should destroy the policies by UNSUBSCRIBING.
    setPolicies(policies: Array<SavePolicy>) {
        this.policies = policies;
    }


    shouldSave(data: SaveData): boolean {
        let should_save = false;
        for(let i = 0; i < this.policies.length; i++) {
            should_save = this.policies[i].shouldSave(data) || should_save;
        }

        if(should_save) {
            // To prevent bugs from maintained state, reset each policy once the composite policy is queried.
            this.reset();
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