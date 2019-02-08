
import { DoubleIterator, List, LinkedList, ListNode } from "data_structures/linked-list";
import Command from "editor/editor_commands/command";



interface ChangeBuffer<T> {
    decrementStart(): void;
    incrementEnd(): void;
    setStart(start: DoubleIterator<T>): void;
    setEnd(end: DoubleIterator<T>): void;
    generate(): Command;
    addToBufferStart(node: ListNode<T>): void;
    addToBufferEnd(node: ListNode<T>): void;

}


class EditorChangeBuffer<T> implements ChangeBuffer<T> {
    start: DoubleIterator<T>;
    end: DoubleIterator<T>;

    list: List<T> = new LinkedList();
    internal_start = this.list.makeFrontIterator();
    internal_end = this.list.makeBackIterator();


    constructor(start: DoubleIterator<T>, end: DoubleIterator<T>) {
        this.start = start.clone();
        this.end = end.clone();
    }

    addToBufferStart(node: ListNode<T>): void {
        this.internal_start.insertNodeAfter(node);
    }

    addToBufferEnd(node: ListNode<T>): void {
        this.internal_end.insertNodeBefore(node);
    }

    decrementStart(): void {
        this.start.prev();
    }
    
    incrementEnd(): void {
        this.end.next();
    }

    setStart(start: DoubleIterator<T>): void {
        this.start = start.clone();
    }

    setEnd(end: DoubleIterator<T>): void {
        this.end = end.clone();
    }

    generate(): Command {

    }
}




export { ChangeBuffer, EditorChangeBuffer };