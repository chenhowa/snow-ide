


import { 
    SavePolicy,
    SaveData,
    KeyDownTimeSavePolicy,
    ArrowKeysSavePolicy,
    CompositeSavePolicy,
    KeycodeSavePolicy,
    SetPolicies
} from "editor/undo_redo/policies/save-policies";


let policy: SavePolicy & SetPolicies;

let SavePolicySingleton = {
    get: function(): SavePolicy & SetPolicies {
        if(!policy) {
            policy = new CompositeSavePolicy([new KeycodeSavePolicy()])
        }

        return policy;
    }
};

export default SavePolicySingleton;