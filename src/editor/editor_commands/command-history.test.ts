import "jest";
import { CommandHistory } from "editor/editor_commands/command-history";
import { MockCommand } from "editor/editor_commands/command";

describe("test command history", () => {
    let history: CommandHistory;

    beforeEach(() => {
        history = new CommandHistory(4);
    })

    test("add", () => {
        history.add(new MockCommand('a'));
        expect(history.getCurrentCommand()).toEqual(new MockCommand('a'));
        expect(history.command_count).toBe(1);

        history.add(new MockCommand('b'));
        expect(history.getCurrentCommand()).toEqual(new MockCommand('b'));
        expect(history.command_count).toBe(2);

        history.add(new MockCommand('c'));
        expect(history.getCurrentCommand()).toEqual(new MockCommand('c'));
        expect(history.command_count).toBe(3);

        history.add(new MockCommand('d'));
        expect(history.getCurrentCommand()).toEqual(new MockCommand('d'));
        expect(history.command_count).toBe(4);

        history.add(new MockCommand('e'));
        expect(history.getCurrentCommand()).toEqual(new MockCommand('e'));
        expect(history.command_count).toBe(4);
    });

    test("do and undo", () => {
        history.add(new MockCommand('a'));
        expect(history.getCurrentCommand()).toEqual(new MockCommand('a'));
        expect(history.command_count).toBe(1);

        history.add(new MockCommand('b'));
        expect(history.getCurrentCommand()).toEqual(new MockCommand('b'));
        expect(history.command_count).toBe(2);

        history.undo();
        expect(history.getCurrentCommand()).toEqual(new MockCommand('a'));
        history.do();
        expect(history.getCurrentCommand()).toEqual(new MockCommand('b'));
    });

    test("undo", () => {

    });
});