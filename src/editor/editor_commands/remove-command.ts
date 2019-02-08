import Command from "editor/editor_commands/command";
import { DoubleIterator, List, LinkedList } from "data_structures/linked-list";


import { Glyph } from "editor/glyph";
import { EditorExecutor } from "editor/editor_executors/editor-executor";


class RemoveCommand implements Command {
    list: List<Glyph>;
    start: DoubleIterator<Glyph>; // functions as pointer to the reference node.
    end: DoubleIterator<Glyph>;
    executor: EditorExecutor;

    static new(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, executor: EditorExecutor): RemoveCommand {
        let command = new RemoveCommand(start, end, new LinkedList(), executor);
        return command;
    }

    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, list: List<Glyph>, executor: EditorExecutor ) {
        this.start = start.clone();
        this.end = end.clone();
        this.list = list;
        this.executor = executor;
    }

    /**
     * @description Range is from this.start to this.end, excluding this.start and this.end.
     *              Everything in between will be reinserted into the list.
     */
    do() {
        if(this.start.equals(this.end)) {
            throw new Error("RemoveCommand: tried to do when start === end");
        }

        let inserter = this.list.makeFrontIterator();
        let scanner = this.start.clone();
        while(true) {
            scanner.next();

            if(scanner.equals(this.end) || !scanner.isValid() ) {
                // If we've reached the end, we've processed all the inserted nodes.
                break;
            } else {
                scanner.remove(false).caseOf({
                    just: (node) => {
                        inserter.insertNodeAfter(node);
                        inserter.next();
                    },
                    nothing: () => {
                        //If there was no node, something is definitely wrong. But we'll try to repair by doing nothing.
                    }
                })
            }
        }

        // Set end to start, to show the command has been done.
        this.end = this.start.clone();

    }

    undo() {
        if(!this.start.equals(this.end)) {
            throw new Error("RemoveCommand: tried to undo when start !== end");
        }

        this.end = this.start.insertListAfter(this.list); // puts end at one past the last inserted node
        this.executor.rerenderRange(this.start, this.end); // rerender the inserted nodes.
    }

    asArray(): Array<Glyph> {
        return this.list.asArray();
    }
}

export default RemoveCommand;