
import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";
import Handler from "editor/handlers/handler";
import { EditorExecutor } from "editor/editor_executors/editor-executor";
import Cursor from "editor/editor_executors/cursor";
import Strings from "string-map";
import { 
    arrowLeft,
    arrowRight,
    arrowUp,
    arrowDown,
    isArrowKey,
    isChar
} from "editor/editor_executors/editor-utils";
import { KeyPressMap } from "editor/keypress-map";

import { History } from "editor/undo_redo/command-history";
import HistorySingleton from "editor/singletons/history-singleton";


class KeydownHandler implements Handler {
    executor: EditorExecutor;
    start: Maybe<DoubleIterator<Glyph>> = Maybe.nothing();
    end: Maybe<DoubleIterator<Glyph>> = Maybe.nothing();
    cursor: Cursor;
    editor: Node;
    keypress_map: KeyPressMap;
    command_history: History<Glyph>;   // Have the history so we can undo and redo as needed.
    
    constructor(executor: EditorExecutor, cursor: Cursor, editor: Node, map: KeyPressMap) {
        this.executor = executor;
        this.cursor = cursor;
        this.editor = editor;
        this.keypress_map = map;
        this.command_history = HistorySingleton.get(); 
    }

    handle(event: any, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>) {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        this.start = Maybe.just(source_start_iter.clone()); // By default, don't move the iterator.
        this.end = Maybe.just(source_end_iter.clone());
        let key: string = event.key;

        if(this._shouldNotHandle(key)) {
            event.preventDefault();
            return;
        }

        let new_iters: Array<DoubleIterator<Glyph>>;

        if(this._controlPressed()) {
            new_iters = this._handleKeyWithControl(event, key, start_iter, end_iter);
        } else {
            new_iters = this._handleKeyAlone(event, key, start_iter, end_iter);
        }
        this.start = Maybe.just( new_iters[0] );
        this.end = Maybe.just( new_iters[1] );
    }

    /**
     * @description Returns true if the handler should not even try to handle this key.
     * @param key 
     */
    _shouldNotHandle(key: string): boolean {
        if(key === "Control") {
            return true;
        }
        return false;
    }

    _controlPressed() {
        return this.keypress_map.isControl();
    }

    _handleKeyWithControl(event: any, key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                                    : Array<DoubleIterator<Glyph>> {
        /* So what might happen here?
            1. Copy.
            2. Paste.
            3. Undo.
            4. Redo

            In the case of copy, nothing needs to happen with regards to where the cursor is.
            In the case of paste, we have all info we need (the current cursor) to figure out where the cursor should be next.
            But in the case of undo and redo, WE DO NOT. Each command technically knows where it ends up. So commands should 
            return a CommandResult object or something, or they should get a reference to the editor, so we can know how
            to set the resulting state. For now we'll go with returning a command object.
        */

        let iterator_array = [source_start_iter.clone(), source_end_iter.clone()];

        if(key === Strings.control.copy) {

        } else if (key === Strings.control.paste) {

        } else if (key === Strings.control.undo) {
            let result = this.command_history.undo();
            iterator_array[0] = result.start_iter ? result.start_iter : iterator_array[0];
            iterator_array[1] = result.end_iter ? result.end_iter : iterator_array[1];

        } else if (key === Strings.control.redo) {
            let result = this.command_history.do();
            iterator_array[0] = result.start_iter ? result.start_iter : iterator_array[0];
            iterator_array[1] = result.end_iter ? result.end_iter : iterator_array[1];
        } else {
            console.log("UNHANDLED KEY WITH CONTROL");
        }

        return iterator_array;
    }

    _handleKeyAlone(event: any, key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph>)
                    : Array<DoubleIterator<Glyph>> {
        
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();
        event.preventDefault(); 
        if(isChar(key)) {
            return this.executor.insertAndRender(key, start_iter, end_iter);
        } else if (key === 'Backspace') {
            return this.executor.deleteAndRender(start_iter, end_iter, false);
        } else if (key === 'Enter') {
            return this.executor.insertAndRerender(Strings.newline, source_start_iter, source_end_iter);  
        } else if (isArrowKey(key)) {
            return this._handleArrowKey(key, start_iter, end_iter);
        } else {
            console.log("UNHANDLED KEY " + key);
        }

        return [start_iter.clone(), end_iter.clone()];
    }

    /**
     * @description: Use arrow key input to move iterator to correct location.
     * @param key 
     * @param source_start_iter 
     */
    _handleArrowKey(key: string, source_start_iter: DoubleIterator<Glyph>, source_end_iter: DoubleIterator<Glyph> )
                                                                                : Array< DoubleIterator<Glyph> > {
        let start_iter = source_start_iter.clone();
        let end_iter = source_end_iter.clone();                                                                            
        if(key === Strings.arrow.left) {
            return arrowLeft(start_iter, end_iter);
        } else if (key === Strings.arrow.right) {
            return arrowRight(start_iter, end_iter);
        } else if (key === Strings.arrow.up) {
            return arrowUp(start_iter, end_iter);
        } else if (key === Strings.arrow.down) {
            return arrowDown(start_iter, end_iter);
        } else {
            throw new Error("NOT AN ARROW KEY");
        }
    }

    getStartIterator() : Maybe< DoubleIterator<Glyph> > {
        return this.start;
    }

    getEndIterator(): Maybe< DoubleIterator<Glyph> > {
        return this.end;
    }
}

export default KeydownHandler;