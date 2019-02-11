import { Observable, Subscription } from "rxjs";
import HistorySingleton from "editor/singletons/history-singleton";
import { Glyph } from "editor/glyph";
import { Command } from "editor/editor_commands/commands";

let subscription: Subscription;

function createSubscription(obs: Observable<Command<Glyph>>): Subscription {
    return obs.subscribe({
        next: (command) => {
            let history = HistorySingleton.get();
            history.add(command);
        }, 
        error: (err) => {

        },
        complete: () => {
            subscription.unsubscribe();
        }
    });
}


let CommandHistoryAddSub = {
    get: function(obs: Observable<Command<Glyph>>) {
        if(!subscription) {
            subscription = createSubscription(obs);
        }
        return subscription;
    }
}

export default CommandHistoryAddSub;