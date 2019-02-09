import Command from "editor/editor_commands/command";
import { DoubleIterator, List, LinkedList } from "data_structures/linked-list";


import { Glyph } from "editor/glyph";
import { EditorExecutor } from "editor/editor_executors/editor-executor";


class RemoveCommand implements Command {
    list: List<Glyph>;
    start: DoubleIterator<Glyph>; // remove/insert start point
    end: DoubleIterator<Glyph>;    // remove/insert end point
    executor: EditorExecutor;
    done: boolean;

    static new(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, list: LinkedList<Glyph>, executor: EditorExecutor): RemoveCommand {
        // By default, create a done command. So this wants to undo only (that is, insert) right now,
        // from its list of things to "unremove";
        let command = new RemoveCommand(start, end, list, executor, true);
        return command;
    }

    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, list: List<Glyph>, executor: EditorExecutor, done: boolean ) {
        this.start = start.clone();
        this.end = end.clone();
        this.list = list;
        this.executor = executor;
        this.done = done;
    }

    /**
     * @description Range is from this.start to this.end, excluding this.start and this.end.
     *              Everything in between will be removed from the target and put into the internal list.
     */
    do() {
        if(this.done) {
            throw new Error("RemoveCommand: tried to do when start === end");
        }

        this.list = new LinkedList();  // reinitialize state in case it was corrupted.

        let internal_inserter = this.list.makeFrontIterator();
        let scanner = this.start.clone();
        while(true) {
            scanner.next();

            if(scanner.equals(this.end) || !scanner.isValid() ) {
                // If we've reached the end, we've processed all the inserted nodes.
                break;
            } else {
                scanner.get().caseOf({
                    just: (glyph) => {
                        glyph.destroyNode();
                    },
                    nothing: () => {
                        //If no glyph, w/e. We'll try to repair by doing nothing.
                    }
                })

                scanner.remove(false).caseOf({
                    just: (node) => {
                        internal_inserter.insertNodeAfter(node);
                        internal_inserter.next();
                    },
                    nothing: () => {
                        //If there was no node, something is definitely wrong. But we'll try to repair by doing nothing.
                    }
                })
            }
        }

        // Rerender the range now that the stuff has been removed.
        this.executor.rerenderRange(this.start, this.end);

        // Prepare to undo.
        this.done = true;

    }

    /**
     * @description = this undoes the remove command. That is, it inserts between this.start and this.end,
     */
    undo() {
        if(!this.done) {
            throw new Error("RemoveCommand: tried to undo when start !== end");
        }

        let remover = this.start.clone();
        while(remover.hasNext()) {
            remover.next();
            if(remover.equals(this.end)) {
                break;
            } else {
                remover.get().caseOf({
                    just: (glyph) => {
                        glyph.destroyNode(); // Destroy the representations of any glyphs that are being removed.
                    },
                    nothing: () => { }
                })

                remover.remove(false);
            }
        }

        // Insert internal list into target.
        this.start.insertListAfter(this.list);
        this.executor.rerenderRange(this.start, this.end); // rerender now that the stuff has been inserted.

        // Prepare to do.
        this.done = false;
    }

    asArray(): Array<Glyph> {
        return this.list.asArray();
    }
}

export default RemoveCommand;