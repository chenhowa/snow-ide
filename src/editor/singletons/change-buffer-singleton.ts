


import { ChangeBuffer, EditorChangeBuffer, ChangeTracker } from "editor/undo_redo/change-buffer";
import { Glyph } from "editor/glyph";
import { EditorRenderer } from "editor/editor_executors/renderer";
import { LinkedList } from "data_structures/linked-list";


let change_buffer: ChangeBuffer<Glyph> & ChangeTracker<Glyph>;

let ChangeBufferSingleton = {
    get: function(node: JQuery<HTMLElement>, list: LinkedList<Glyph> ): ChangeBuffer<Glyph> & ChangeTracker<Glyph> {
        if(!change_buffer) {
            change_buffer = new EditorChangeBuffer(
                list.makeFrontIterator(),
                list.makeBackIterator(),
                new EditorRenderer(node.get(0))
            );
        }

        return change_buffer;
    }
}

export default ChangeBufferSingleton;