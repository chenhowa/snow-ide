
import { DoubleIterator, List, LinkedList, ListNode } from "data_structures/linked-list";
import Command from "editor/editor_commands/command";
import { InsertCommand, RemoveCommand } from "editor/editor_commands/commands";
import { Glyph } from "editor/glyph";

import { Renderer } from "editor/editor_executors/renderer";


interface ChangeBuffer<T> {
    setStartAnchor(start: DoubleIterator<T>): void;
    setEndAnchor(end: DoubleIterator<T>): void;
    setAnchors(start: DoubleIterator<T>, end: DoubleIterator<T>): void;
    generateAndClean(): Command<T>;
    isDirty(): boolean;
}

interface ChangeTracker<T> {
    decrementStartAnchor(): void;
    incrementEndAnchor(): void;
    addToBufferStart(node: ListNode<T>): void;
    addToBufferEnd(node: ListNode<T>): void;
    equalsStartAnchor(iter: DoubleIterator<T>): boolean;
    equalsEndAnchor(iter: DoubleIterator<T>): boolean;
}


class EditorChangeBuffer implements ChangeBuffer<Glyph>, ChangeTracker<Glyph> {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;

    list: List<Glyph> = new LinkedList();
    internal_start: DoubleIterator<Glyph> = this.list.makeFrontIterator();
    internal_end: DoubleIterator<Glyph> = this.list.makeBackIterator();
    dirty: boolean = false;

    renderer: Renderer;

    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, renderer: Renderer) {
        this.start = start.clone();
        this.end = end.clone();
        this.renderer = renderer;

        this.resetListState();
    }

    isDirty(): boolean {
        return this.dirty;
    }

    addToBufferStart(node: ListNode<Glyph>): void {
        this.internal_start.insertNodeAfter(node);
        this.dirty = true;
    }

    addToBufferEnd(node: ListNode<Glyph>): void {
        this.internal_end.insertNodeBefore(node);
        this.dirty = true;
    }

    decrementStartAnchor(): void {
        this.start.prev();
        this.dirty = true;
    }
    
    incrementEndAnchor(): void {
        this.end.next();
        this.dirty = true;
    }

    setStartAnchor(start: DoubleIterator<Glyph>): void {
        this.start = start.clone();
        this.dirty = true;
    }

    setEndAnchor(end: DoubleIterator<Glyph>): void {
        this.end = end.clone();
        this.dirty = true;
    }

    setAnchors(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>): void {
        this.setStartAnchor(start);
        this.setEndAnchor(end);
    }

    equalsStartAnchor(iter: DoubleIterator<Glyph>): boolean {
        return this.start.equals(iter);
    }

    equalsEndAnchor(iter: DoubleIterator<Glyph>): boolean {
        return this.end.equals(iter);
    }

    generateAndClean(): Command<Glyph> {
        let command: Command<Glyph>;
        if(this.list.isEmpty()) {
            command = InsertCommand.new(this.start, this.end, this.renderer);
        } else {
            command = RemoveCommand.new(this.start, this.end, this.list, this.renderer);
        }

        this.dirty = false;
        this.resetListState();

        return command;
    }

    resetListState(): void {
        this.list = new LinkedList();
        this.internal_start = this.list.makeFrontIterator();
        this.internal_end = this.list.makeBackIterator();
    }
}




export { ChangeBuffer, EditorChangeBuffer, ChangeTracker };