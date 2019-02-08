import Command from "editor/editor_commands/command";
import { 
    DoubleIterator,
    List
} from "data_structures/linked-list";

import { Glyph } from "editor/glyph";


class InsertCommand implements Command {
    list: List<Glyph>
    start: DoubleIterator<Glyph> // functions as pointer to the reference node.

    constructor(start: DoubleIterator<Glyph>, list: List<Glyph>) {
        this.start = start;
        this.list = list;
    }

    do() {

    }

    undo() {

    }
}