

interface Command {
    do(): void;
    undo(): void;
}


class MockCommand implements Command {
    done: boolean = true;
    tag: string;
    constructor(tag: string) {
        this.tag = tag;
    }

    do() {
        if(this.done) {
            throw new Error("Called do on a done command");
        }

        this.done = true;
    }

    undo() {
        if(!this.done) {
            throw new Error("Called undo on an undone command");
        }
        this.done = false;
    }   
}

export default Command;
export { MockCommand, Command };