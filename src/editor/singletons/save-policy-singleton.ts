


import { 
    SavePolicy,
    CompositeSavePolicy,
    SetPolicies,
} from "editor/undo_redo/policies/save-policies";


let policy: SavePolicy & SetPolicies;

let SavePolicySingleton = {
    get: function(): SavePolicy & SetPolicies {
        if(!policy) {
            policy = new CompositeSavePolicy([])
        }

        return policy;
    }
};

export default SavePolicySingleton;