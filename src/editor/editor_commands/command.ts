import { DoubleIterator } from "data_structures/linked-list";


interface CommandResult<T> {
    start_iter?: DoubleIterator<T>;
    end_iter?: DoubleIterator<T>;
}


interface Command<T> {
    do(): CommandResult<T>;
    undo(): CommandResult<T>;
    asString(): string;
}


class MockCommand<T> implements Command<T> {
    done: boolean = true;
    tag: string;
    constructor(tag: string) {
        this.tag = tag;
    }

    do(): CommandResult<T> {
        if(this.done) {
            throw new Error("Called do on a done command");
        }
        this.done = true;

        return {};
    }

    undo(): CommandResult<T> {
        if(!this.done) {
            throw new Error("Called undo on an undone command");
        }
        this.done = false;

        return {};
    }

    asString(): string {
        return "Mock Command";
    }
}

export default Command;
export { MockCommand, Command, CommandResult };