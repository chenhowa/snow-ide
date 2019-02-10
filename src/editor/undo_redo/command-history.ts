
import Command from "editor/editor_commands/command";
import { LinkedList, List, DoubleIterator } from "data_structures/linked-list";

interface History {
    do() : void;
    undo(): void;
}

interface AddCommand {
    add(command: Command): void;
}


class CommandHistory implements History, AddCommand {
    current_command: DoubleIterator<Command>;
    commands: List<Command>
    command_count: number = 0;
    max_count: number;

    constructor(max_count: number) {
        if(max_count < 1) {
            throw new Error("Cannot make a command history with a nonpositive integer max_count");
        }
        this.commands = new LinkedList();
        this.current_command = this.commands.makeFrontIterator();
        this.max_count = max_count;
    }

    do() {
        // Only do the next command if it exists.
        if(this.current_command.hasNext()) {
            this.current_command.next();
            this.current_command.get().caseOf({
                just: (command) => {
                    command.do();
                },
                nothing: () => {
                    // command does not exist. Do nothng
                }
            });
        }
    }

    undo() {
        // Only do this if there is a command to undo.
        if(this.current_command.isValid()) {
            this.current_command.get().caseOf({
                just: (command) => {
                    command.undo();
                },
                nothing: () => {
                    // Command does not exist. Do nothing.
                }
            });
            this.current_command.prev();
        }
    }

    add(new_command: Command) {

        while(this.current_command.hasNext()) {
            // Remove commands that will be overwritten by the newly added one.
            this.current_command.removeNext();
            this.command_count -= 1;
        }

        this.current_command.insertAfter(new_command);
        this.command_count += 1;

        // The latest command has already been done, presumably. So
        // we just advance to it.
        this.current_command.next();

        if(this.command_count > this.max_count) {
            // If we are maxed out, remove first command
            let remover = this.commands.makeFrontIterator();
            if(remover.hasNext()) {
                remover.removeNext();
                this.command_count -= 1;
            } else {
                throw new Error("Commmand History add: cannot remove first command despite being at max count");
            }
        }
    }
    
    getCurrentCommand(): Command {
        return this.current_command.grab();
    }
}


export { History, AddCommand, CommandHistory };