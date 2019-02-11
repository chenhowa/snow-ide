
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { Glyph } from "editor/glyph";
import { LinkedList } from "data_structures/linked-list";


import ChangeBufferSingleton from "editor/singletons/change-buffer-singleton";
import Command from "editor/editor_commands/command";


let change_buffer_obs: Observable<Command<Glyph> | undefined>;


function createChangeBufferObservable(obs: Observable<boolean>, node: JQuery<HTMLElement>, list: LinkedList<Glyph> ): Observable<Command<Glyph> | undefined> {
    let change_buffer_obs = obs.pipe(map((should_save) => {
        let buffer = ChangeBufferSingleton.get(node, list);

        if(should_save) {
            return buffer.generateAndClean();
        } else {
            return undefined;
        }        
    }));

    return change_buffer_obs;
}

let ChangeBufferObservable = {
    get: function(obs: Observable<boolean>, node: JQuery<HTMLElement>, list: LinkedList<Glyph>): Observable<Command<Glyph> | undefined> {
        if(!change_buffer_obs) {
            change_buffer_obs = createChangeBufferObservable(obs, node, list);
        }
        return change_buffer_obs;
    }
}


export default ChangeBufferObservable;
export { ChangeBufferObservable };