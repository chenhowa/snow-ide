

import { fromEvent } from 'rxjs';

import { SavePolicy, SaveData } from "editor/undo_redo/policies/save-policy";


/**
 * @description This policy recommends saving once the last two recorded keystrokes differ in time by
 *              X amount of milliseconds.
 */
class KeydownTimeSavePolicy implements SavePolicy {
    max_difference_in_ms: number;
    last_difference_in_ms: number = 0;
    watch_node: JQuery<HTMLElement>;
    last_time_in_ms: number = new Date().valueOf();

    constructor(max_difference_in_ms: number, watch_node: JQuery<HTMLElement> ) {
        this.max_difference_in_ms = max_difference_in_ms;
        this.watch_node = watch_node;

        let keyDownObs = fromEvent(this.watch_node, 'keydown');
        let keyDownSub = keyDownObs.subscribe({
            next: (event: any ) => {
                let key: string = event.key;
                console.log("Policy");
                
                // Always track the log of how long it took.
                let new_time_in_ms = new Date().valueOf();
                this.last_difference_in_ms = new_time_in_ms - this.last_time_in_ms;
                this.last_time_in_ms = new_time_in_ms;
            },
            error: (err) => {

            },
            complete: () => {

            }
        });
    }

    shouldSave(data?: SaveData): boolean {
        if(data) {
            // Anything?
        }

        return this.last_difference_in_ms < this.max_difference_in_ms;
    }

    reset(): void {
        this.last_difference_in_ms = 0;
        this.last_time_in_ms = new Date().valueOf();
    }
}

export default KeydownTimeSavePolicy;