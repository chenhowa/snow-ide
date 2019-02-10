
import { History, CommandHistory, AddCommand } from "editor/undo_redo/command-history";
import { Glyph } from "editor/glyph";

var history: CommandHistory<Glyph>;

var HistorySingleton = {
    get: function(): History<Glyph> & AddCommand<Glyph> {
        if(!history) {
            history = new CommandHistory(15);
        }
        return history;
    }
}


export default HistorySingleton;