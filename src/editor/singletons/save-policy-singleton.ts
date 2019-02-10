


import { 
    SavePolicy,
    SaveData,
    KeyDownTimeSavePolicy,
    CompositeSavePolicy,
    CurrentKeySavePolicy,
    SetPolicies
} from "editor/undo_redo/policies/save-policies";


let policy: SavePolicy & SetPolicies;

let SavePolicySingleton = {
    get: function(): SavePolicy & SetPolicies {
        if(!policy) {
            policy = new CompositeSavePolicy([new CurrentKeySavePolicy()])
        }

        return policy;
    }
};

export default SavePolicySingleton;