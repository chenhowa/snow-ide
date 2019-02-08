
import { History, CommandHistory } from "editor/editor_commands/command-history";

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