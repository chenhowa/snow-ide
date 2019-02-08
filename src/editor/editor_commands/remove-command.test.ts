import "jest";
import { LinkedList, populate_list } from "data_structures/linked-list";
import { Glyph, GlyphStyle } from "editor/glyph";
import RemoveCommand from "editor/editor_commands/remove-command";
import { MockEditorExecutor } from "editor/editor_executors/editor-executor";


describe("validate doing removal behavior", () => {
    let list: LinkedList<Glyph>;

    beforeEach(() => {
        list = new LinkedList();
        let array = [
            new Glyph('a', new GlyphStyle()),
            new Glyph('b', new GlyphStyle()),
            new Glyph('c', new GlyphStyle()),
            new Glyph('d', new GlyphStyle()),
            new Glyph('e', new GlyphStyle())
        ];
        populate_list(list, array);
    });

    test("from front of list", () => {
        let first_iter = list.makeFrontIterator();
        let second_iter = list.makeFrontIterator();
        second_iter.next();
        second_iter.next(); // points at 'b'

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.

        let result_array = list.asArray();
        expect(result_array).toEqual([
            new Glyph('b', new GlyphStyle()),
            new Glyph('c', new GlyphStyle()),
            new Glyph('d', new GlyphStyle()),
            new Glyph('e', new GlyphStyle())
        ]);

        expect(command.asArray()).toEqual([
            new Glyph('a', new GlyphStyle())
        ]);
    });


    test("from middle of list", () => {
        let first_iter = list.makeFrontIterator();
        first_iter.next();
        first_iter.next(); // points at b
        let second_iter = list.makeBackIterator();
        second_iter.prev(); // points at 'e'

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.

        let result_array = list.asArray();
        expect(result_array).toEqual([
            new Glyph('a', new GlyphStyle()),
            new Glyph('b', new GlyphStyle()),
            new Glyph('e', new GlyphStyle()),
        ]);

        expect(command.asArray()).toEqual([
            new Glyph('c', new GlyphStyle()),
            new Glyph('d', new GlyphStyle())
        ]);
    });


    test("from back of list", () => {
        let first_iter = list.makeBackIterator();
        first_iter.prev();
        first_iter.prev();
        first_iter.prev(); // points at c
        let second_iter = list.makeBackIterator(); // points at exact back of iterator.

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.

        let result_array = list.asArray();
        expect(result_array).toEqual([
            new Glyph('a', new GlyphStyle()),
            new Glyph('b', new GlyphStyle()),
            new Glyph('c', new GlyphStyle()),
        ]);

        expect(command.asArray()).toEqual([
            new Glyph('d', new GlyphStyle()),
            new Glyph('e', new GlyphStyle())
        ]);
    });

    test("whole list", () => {
        let first_iter = list.makeFrontIterator();
        let second_iter = list.makeBackIterator();

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.

        let result_array = list.asArray();
        expect(result_array).toEqual([
            // empty!
        ]);

        expect(command.asArray()).toEqual([
            new Glyph('a', new GlyphStyle()),
            new Glyph('b', new GlyphStyle()),
            new Glyph('c', new GlyphStyle()),
            new Glyph('d', new GlyphStyle()),
            new Glyph('e', new GlyphStyle())
        ]);

    })
})

describe("validate undoing removal behavior", () => {
    let list: LinkedList<Glyph>;
    let expected_array: Array<Glyph> = [];

    beforeEach(() => {
        list = new LinkedList();
        let array = [
            new Glyph('a', new GlyphStyle()),
            new Glyph('b', new GlyphStyle()),
            new Glyph('c', new GlyphStyle()),
            new Glyph('d', new GlyphStyle()),
            new Glyph('e', new GlyphStyle()),
        ];
        expected_array = [
            new Glyph('a', new GlyphStyle()),
            new Glyph('b', new GlyphStyle()),
            new Glyph('c', new GlyphStyle()),
            new Glyph('d', new GlyphStyle()),
            new Glyph('e', new GlyphStyle()),
        ];
        populate_list(list, array);
    });

    test("from front of list", () => {
        let first_iter = list.makeFrontIterator();
        let second_iter = list.makeFrontIterator();
        second_iter.next();
        second_iter.next(); // points at 'b'

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.

        expect(list.asArray()).toEqual([
            new Glyph('b', new GlyphStyle()),
            new Glyph('c', new GlyphStyle()),
            new Glyph('d', new GlyphStyle()),
            new Glyph('e', new GlyphStyle())
        ]);

        expect(command.asArray()).toEqual([
            new Glyph('a', new GlyphStyle())
        ]);

        command.undo();

        expect(command.asArray()).toEqual([]);

        let result_array = list.asArray();
        expect(result_array).toEqual(
            expected_array
        );
    });

    
    test("from middle of list", () => {
        let first_iter = list.makeFrontIterator();
        first_iter.next();
        first_iter.next(); // points at b
        let second_iter = list.makeBackIterator();
        second_iter.prev(); // points at 'e'

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.
        command.undo();


        expect(command.start.grab()).toEqual(new Glyph('b', new GlyphStyle()));
        expect(command.end.grab()).toEqual(new Glyph('e', new GlyphStyle()));


        expect(command.asArray()).toEqual([]);
        let result_array = list.asArray();
        expect(result_array).toEqual(
            expected_array
        );

    });

    
    test("from back of list", () => {
        let first_iter = list.makeBackIterator();
        first_iter.prev();
        first_iter.prev();
        first_iter.prev(); // points at c
        let second_iter = list.makeBackIterator(); // points at exact back of iterator.

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.
        command.undo();

        let result_array = list.asArray();
        expect(result_array).toEqual(
            expected_array
        );

        expect(command.asArray()).toEqual([]);
    });

    test("whole list", () => {
        let first_iter = list.makeFrontIterator();
        let second_iter = list.makeBackIterator();

        let command = RemoveCommand.new(first_iter, second_iter, new MockEditorExecutor());
        command.do(); // at this point, the list should be shorter.
        command.undo();

        let result_array = list.asArray();
        expect(result_array).toEqual(expected_array);

        expect(command.asArray()).toEqual([]);

    })
})