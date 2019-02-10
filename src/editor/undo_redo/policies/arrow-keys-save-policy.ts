import {
    isChar,
    isArrowKey
} from "editor/editor_executors/editor-utils";

import { fromEvent } from 'rxjs';

import { SavePolicy, SaveData } from "editor/undo_redo/policies/save-policy";


class ArrowKeysSavePolicy implements SavePolicy {
    pressed: boolean = false;
    node: JQuery<HTMLElement>;

    constructor(node: JQuery<HTMLElement>) {
        this.node = node;
        let keydownObs = fromEvent(node, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {
                let key: string = event.key;
                this.pressed = isArrowKey(key);
            }
        });
    }

    shouldSave(data: SaveData): boolean {
        return this.pressed;
    }

    reset(): void {
        this.pressed = false;
    }
}

export default ArrowKeysSavePolicy;