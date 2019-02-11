
import { Observable, fromEvent } from "rxjs";
import { map } from "rxjs/operators";

import SavePolicySingleton from "editor/singletons/save-policy-singleton";
import { SavePolicy, SaveData } from "editor/undo_redo/policies/save-policies";



function createSavePolicyObservable(obs: Observable<SaveData>, node: JQuery<HTMLElement>): Observable<boolean> {
    let save_policy_obs = obs.pipe(map( (event: any) => {
        let save_policy: SavePolicy = SavePolicySingleton.get();
        let save_data: SaveData = {
            key: event.key
        };
        return save_policy.shouldSave(save_data);
    }));

    return save_policy_obs;
}

let save_policy_obs: Observable<boolean>;

let SavePolicyObservable = {
    get: function(obs: Observable<SaveData>, node: JQuery<HTMLElement>): Observable<boolean> {
        if(!save_policy_obs) {
            save_policy_obs = createSavePolicyObservable(obs, node);
        }
        return save_policy_obs;
    }
}




export default SavePolicyObservable;