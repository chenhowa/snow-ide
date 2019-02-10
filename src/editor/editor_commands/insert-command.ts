import {Command, CommandResult} from "editor/editor_commands/command";
import { 
    DoubleIterator,
    List,
    LinkedList
} from "data_structures/linked-list";

import { Glyph } from "editor/glyph";
import { Renderer } from "editor/editor_executors/renderer";
import RemoveCommand from "editor/editor_commands/remove-command";


class InsertCommand implements Command<Glyph> {
    remove_command: RemoveCommand;

    static new(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, renderer: Renderer) {
        // By default, creates a done Insertion. The internal linked list is empty,
        // so UNDO needs to be called to fill it up with what was previously inserted.
        return new InsertCommand(start, end, new LinkedList(), renderer, true);
    }

    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, list: List<Glyph>, renderer: Renderer, done: boolean) {
        // Piggy back off the inverse remove comand. If the insert is done, the remove is NOT done.
        this.remove_command = new RemoveCommand(start, start, list, renderer, !done);
    }

    do(): CommandResult<Glyph> {
        try {
            return this.remove_command.undo();
        } catch(e) {
            throw new Error("InsertCommand do(): remove_command.undo threw the error " + e.message);
        }
    }

    /**
     * @description Range is from this.start to this.end, excluding this.start and this.end.
     *              Everything in between will be reinserted into the list.
     */
    undo(): CommandResult<Glyph> {
        try {
            return this.remove_command.do();
        } catch(e) {
            throw new Error("InsertCommand do(): remove_command.do threw the error " + e.message);
        }
    }
}

export default InsertCommand;