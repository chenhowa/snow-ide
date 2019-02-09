import Command from "editor/editor_commands/command";
import { 
    DoubleIterator,
    List,
    LinkedList
} from "data_structures/linked-list";

import { Glyph } from "editor/glyph";
import { EditorExecutor } from "editor/editor_executors/editor-executor";
import RemoveCommand from "editor/editor_commands/remove-command";


class InsertCommand implements Command {
    remove_command: RemoveCommand;

    static new(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, executor: EditorExecutor) {
        // By default, creates a done Insertion. The internal linked list is empty,
        // so UNDO needs to be called to fill it up with what was previously inserted.
        return new InsertCommand(start, end, new LinkedList(), executor, true);
    }

    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, list: List<Glyph>, executor: EditorExecutor, done: boolean) {
        // Piggy back off the inverse remove comand. If the insert is done, the remove is NOT done.
        this.remove_command = new RemoveCommand(start, start, list, executor, !done);
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