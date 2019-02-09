
import { History, CommandHistory } from "editor/undo_redo/command-history";

var history: CommandHistory;

var HistorySingleton = {
    get: function(): History {
        if(!history) {
            history = new CommandHistory(15);
        }
        return history;
    }
}


export default HistorySingleton;