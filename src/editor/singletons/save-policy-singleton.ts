


import { 
    SavePolicy,
    SaveData,
    KeyDownTimeSavePolicy,
    ArrowKeysSavePolicy,
    CompositeSavePolicy,
    KeycodeSavePolicy
} from "editor/undo_redo/policies/save-policies";


let policy: SavePolicy;

let SavePolicySingleton = {
    get: function(): SavePolicy {
        if(!policy) {
            policy = new CompositeSavePolicy([new KeycodeSavePolicy()])
        }

        return policy;
    }
};

export default SavePolicySingleton;