
import { History, CommandHistory, AddCommand } from "editor/undo_redo/command-history";

var history: CommandHistory;

var HistorySingleton = {
    get: function(): History & AddCommand {
        if(!history) {
            history = new CommandHistory(15);
        }
        return history;
    }
}


export default HistorySingleton;