
import {Command, CommandResult} from "editor/editor_commands/command";
import { LinkedList, List, DoubleIterator } from "data_structures/linked-list";

interface History<T> {
    do() : CommandResult<T>;
    undo(): CommandResult<T>;
    asArray(): Array<string>
}

interface AddCommand<T> {
    add(command: Command<T>): void;
}


class CommandHistory<T> implements History<T>, AddCommand<T> {
    current_command: DoubleIterator<Command<T>>;
    commands: List<Command<T>>
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

    asArray(): Array<string> {
        let array = this.commands.asArray().map((command) => {
            return command.asString();
        });

        let current = this.current_command.get().caseOf({
            just: (command) => {
                return "some command";
            },
            nothing: () => {
                return "some sentinel";
            }
        })

        array.unshift(current);

        return array;
    }

    do(): CommandResult<T> {
        // Only do the next command if it exists.
        let result = {};
        if(this.current_command.hasNext()) {
            this.current_command.next();
            this.current_command.get().caseOf({
                just: (command) => {
                    result = command.do();
                },
                nothing: () => {
                    // command does not exist. Do nothng
                }
            });
        } else {
            console.log("NO NEXT COMMAND");
        }
        return result;
    }

    undo(): CommandResult<T> {
        // Only do this if there is a command to undo.
        let result = {};
        if(this.current_command.isValid()) {
            this.current_command.get().caseOf({
                just: (command) => {
                    result = command.undo();
                },
                nothing: () => {
                    // Command does not exist. Do nothing.
                }
            });
            this.current_command.prev();
            
        }

        return result;
    }

    add(new_command: Command<T>) {

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
    
    getCurrentCommand(): Command<T> {
        return this.current_command.grab();
    }
}


export { History, AddCommand, CommandHistory };