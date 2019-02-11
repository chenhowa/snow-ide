import { Observable, Subscription } from "rxjs";
import ChangeBufferSingleton from "editor/singletons/change-buffer-singleton";
import { LinkedList, DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";


let subscription: Subscription;

interface BufferData {
    start_anchor?: DoubleIterator<Glyph>;
    end_anchor?: DoubleIterator<Glyph>
    collapse_direction: number;
    decrement_start: boolean;
    increment_end: boolean;
    reset: boolean;
}


function createSubscription(obs: Observable<BufferData>, node: JQuery<HTMLElement>, list: LinkedList<Glyph>): Subscription {
    return obs.subscribe({
        next: (data) => {
            let buffer = ChangeBufferSingleton.get(node, list);

            if(data.increment_end) {
                buffer.incrementEndAnchor();
            }

            if(data.decrement_start) {
                buffer.decrementStartAnchor();
            }

            if(data.reset) {
                buffer.resetListState();
            }

            if(data.start_anchor) {
                buffer.setStartAnchor(data.start_anchor);
            }

            if(data.end_anchor) {
                buffer.setEndAnchor(data.end_anchor);
            }

            if(data.collapse_direction > 0) {
                buffer.collapseToEnd();
            } else if (data.collapse_direction < 0) {
                buffer.collapseToStart();
            } else {
                // Do nothing. No collapse is the default for the buffer.
            }

        },
        error: (err) => { 

        },
        complete: () => {
            subscription.unsubscribe();
        }
    })
}

let ChangeBufferExecuteSub = {
    get: function(obs: Observable<BufferData>, node: JQuery<HTMLElement>, list: LinkedList<Glyph>): Subscription {
        if(!subscription) {
            subscription = createSubscription(obs, node, list);
        }

        return subscription;
    }
}

export { ChangeBufferExecuteSub, BufferData };
