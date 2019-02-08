

interface Command {
    do(): void;
    undo(): void;
}

export default Command;