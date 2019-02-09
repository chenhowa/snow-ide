
import { DoubleIterator, List, LinkedList, ListNode } from "data_structures/linked-list";
import Command from "editor/editor_commands/command";
import { InsertCommand, RemoveCommand } from "editor/editor_commands/commands";
import { EditorExecutor } from "editor/editor_executors/editor-executor";
import { Glyph } from "editor/glyph";



interface ChangeBuffer<T> {
    decrementStart(): void;
    incrementEnd(): void;
    setStart(start: DoubleIterator<T>): void;
    setEnd(end: DoubleIterator<T>): void;
    generate(): Command;
    addToBufferStart(node: ListNode<T>): void;
    addToBufferEnd(node: ListNode<T>): void;

}


class EditorChangeBuffer implements ChangeBuffer<Glyph> {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;

    list: List<Glyph> = new LinkedList();
    internal_start = this.list.makeFrontIterator();
    internal_end = this.list.makeBackIterator();

    executor: EditorExecutor;


    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, executor: EditorExecutor) {
        this.start = start.clone();
        this.end = end.clone();
        this.executor = executor;
    }

    addToBufferStart(node: ListNode<Glyph>): void {
        this.internal_start.insertNodeAfter(node);
    }

    addToBufferEnd(node: ListNode<Glyph>): void {
        this.internal_end.insertNodeBefore(node);
    }

    decrementStart(): void {
        this.start.prev();
    }
    
    incrementEnd(): void {
        this.end.next();
    }

    setStart(start: DoubleIterator<Glyph>): void {
        this.start = start.clone();
    }

    setEnd(end: DoubleIterator<Glyph>): void {
        this.end = end.clone();
    }

    generate(): Command {
        let command: Command;
        if(this.list.isEmpty()) {
            // Then we must only have been inserting, not removing.
            command = InsertCommand.new(this.start, this.end, this.executor);
        } else {
            // Then we removed stuff.
            command = RemoveCommand.new(this.start, this.end, this.list, this.executor);
        }

        // Since we generated a command, we now need to clear state, since we don't want to edit the contents of the commands by accident.
        this.list = new LinkedList();
        this.internal_start = this.list.makeFrontIterator();
        this.internal_end = this.list.makeBackIterator();

        return command;
    }
}




export { ChangeBuffer, EditorChangeBuffer };