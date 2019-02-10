import {Command, CommandResult} from "editor/editor_commands/command";
import { DoubleIterator, List, LinkedList } from "data_structures/linked-list";


import { Glyph } from "editor/glyph";
import { Renderer } from "editor/editor_executors/renderer";


class RemoveCommand implements Command<Glyph> {
    list: List<Glyph>;
    start: DoubleIterator<Glyph>; // remove/insert start point
    end: DoubleIterator<Glyph>;    // remove/insert end point
    renderer: Renderer;
    done: boolean;

    inserted_string: string;

    static new(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, list: LinkedList<Glyph>, renderer: Renderer): RemoveCommand {
        // By default, create a done command. So this wants to undo only (that is, insert) right now,
        // from its list of things to "unremove";
        let command = new RemoveCommand(start, end, list, renderer, true);
        return command;
    }

    constructor(start: DoubleIterator<Glyph>, end: DoubleIterator<Glyph>, list: List<Glyph>, renderer: Renderer, done: boolean ) {
        this.start = start.clone();
        this.end = end.clone();
        this.list = list;
        this.renderer = renderer;
        this.done = done;
        this.inserted_string = "";

        if(!this.done) {
            // Then we inserted. Let's cache what we inserted.
            let cache = this.start.clone();
            
            while(cache.hasNext()) {
                cache.next();
                if(cache.equals(this.end)) {
                    break;
                } else {
                    cache.get().caseOf({
                        just: (glyph) => {
                            this.inserted_string += glyph.glyph;//
                        },
                        nothing: () => {

                        }
                    })
                }
            }
        }
    }

    asString(): string {
        let string = "";
        if(this.done) {
            // We did the remove.
            let chars = this.list.asArray().map((glyph) => {
                return glyph.glyph;
            });

            string += "Removed " + chars.join('');
        } else {
            // We did the insert.
            string += "Inserted " + this.inserted_string;
        }

        string += ". Start anchor: ";
        string += this.start.get().caseOf({
            just: (glyph) => {
                return glyph.glyph;
            },
            nothing: () => {
                return "not valid or sentinel"
            }
        });
        string += ", End anchor: ";
        string += this.end.get().caseOf({
            just: (glyph) => {
                return glyph.glyph;
            },
            nothing: () => {
                return "not valid or sentinel";
            }
        });

        return string;

    }

    /**
     * @description Range is from this.start to this.end, excluding this.start and this.end.
     *              Everything in between will be removed from the target and put into the internal list.
     */
    do(): CommandResult<Glyph> {
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
        this.renderer.rerender(this.start, this.end);

        // Prepare to undo.
        this.done = true;

        return this._generateResult();

    }

    /**
     * @description = this undoes the remove command. That is, it inserts between this.start and this.end,
     */
    undo(): CommandResult<Glyph> {
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

        // We will do the insert now, so cache the inserted string.
        let chars = this.list.asArray().map((glyph) => {
            return glyph.glyph;
        });
        this.inserted_string = chars.join('');

        // Insert internal list into target.
        this.start.insertListAfter(this.list);
        this.renderer.rerender(this.start, this.end);

        // Prepare to do.
        this.done = false;

        return this._generateResult();
    }

    _generateResult(): CommandResult<Glyph> {
        let result_end = this.end.clone();
        result_end.prev();
        return {
            start_iter: this.start.clone(),
            end_iter: result_end
        }
    }

    asArray(): Array<Glyph> {
        return this.list.asArray();
    }
}

export default RemoveCommand;