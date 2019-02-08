import Command from "editor/editor_commands/command";
import { 
    DoubleIterator,
    List
} from "data_structures/linked-list";

import { Glyph } from "editor/glyph";
import { EditorExecutor } from "editor/editor_executors/editor-executor";
import RemoveCommand from "editor/editor_commands/remove-command";


class InsertCommand implements Command {
    remove_command: RemoveCommand;

    static new(start: DoubleIterator<Glyph>, list: List<Glyph>, executor: EditorExecutor) {
        return new InsertCommand(start, list, executor);
    }

    constructor(start: DoubleIterator<Glyph>, list: List<Glyph>, executor: EditorExecutor) {
        this.remove_command = new RemoveCommand(start, start, list, executor);
    }

    do() {
        try {
            this.remove_command.undo();
        } catch(e) {
            throw new Error("InsertCommand do(): remove_command.undo threw the error " + e.message);
        }
    }

    /**
     * @description Range is from this.start to this.end, excluding this.start and this.end.
     *              Everything in between will be reinserted into the list.
     */
    undo() {
        try {
            this.remove_command.do();
        } catch(e) {
            throw new Error("InsertCommand do(): remove_command.do threw the error " + e.message);
        }
    }
}

export default InsertCommand;