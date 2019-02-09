
import { DoubleIterator, List, LinkedList, ListNode } from "data_structures/linked-list";
import Command from "editor/editor_commands/command";
import { InsertCommand, RemoveCommand } from "editor/editor_commands/commands";
import { EditorExecutor } from "editor/editor_executors/editor-executor";
import { Glyph } from "editor/glyph";



interface ChangeBuffer<T> {
    decrementStartAnchor(): void;
    incrementEndAnchor(): void;
    setStartAnchor(start: DoubleIterator<T>): void;
    setEndAnchor(end: DoubleIterator<T>): void;
    generate(): Command;
    addToBufferStart(node: ListNode<T>): void;
    addToBufferEnd(node: ListNode<T>): void;
}


class EditorChangeBuffer implements ChangeBuffer<Glyph> {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;

    list: List<Glyph> = new LinkedList();
    internal_start: DoubleIterator<Glyph> = this.list.makeFrontIterator();
    internal_end: DoubleIterator<Glyph> = this.list.makeBackIterator();

    executor: EditorExecutor;


    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, executor: EditorExecutor) {
        this.start = start.clone();
        this.end = end.clone();
        this.executor = executor;

        this.resetListState();
    }

    addToBufferStart(node: ListNode<Glyph>): void {
        this.internal_start.insertNodeAfter(node);
    }

    addToBufferEnd(node: ListNode<Glyph>): void {
        this.internal_end.insertNodeBefore(node);
    }

    decrementStartAnchor(): void {
        this.start.prev();
    }
    
    incrementEndAnchor(): void {
        this.end.next();
    }

    setStartAnchor(start: DoubleIterator<Glyph>): void {
        this.start = start.clone();
    }

    setEndAnchor(end: DoubleIterator<Glyph>): void {
        this.end = end.clone();
    }

    generate(): Command {
        let command: Command;
        if(this.list.isEmpty()) {
            command = InsertCommand.new(this.start, this.end, this.executor);
        } else {
            command = RemoveCommand.new(this.start, this.end, this.list, this.executor);
        }

        this.resetListState();

        return command;
    }

    resetListState(): void {
        this.list = new LinkedList();
        this.internal_start = this.list.makeFrontIterator();
        this.internal_end = this.list.makeBackIterator();
    }
}




export { ChangeBuffer, EditorChangeBuffer };