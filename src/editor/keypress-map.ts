
import { fromEvent } from 'rxjs';

interface KeyPressMap {
    isControl(): boolean;

    runOn(node: JQuery<HTMLElement>): void;
}

class EditorKeyPressMap implements KeyPressMap {
    Control : boolean = false;

    constructor() {

    }

    isControl(): boolean {
        return this.Control;
    }

    runOn(node: JQuery<HTMLElement>) {
        let keydownObs = fromEvent(node, 'keydown');
        let keydownSub = keydownObs.subscribe({
            next: (event: any) => {
                let key: string = event.key;
                if(key === 'Control') {
                    this.Control = true;
                }
            }
        });

        let keyupObs = fromEvent(node, 'keyup');
        let keyupSub = keyupObs.subscribe({
            next: (event: any) => {
                let key: string = event.key;
                if(key === 'Control') {
                    this.Control = false;
                }
            }
        })
    }
}

export { 
    KeyPressMap,
    EditorKeyPressMap
}