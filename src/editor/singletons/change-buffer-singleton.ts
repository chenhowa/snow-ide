



import { ChangeBuffer, EditorChangeBuffer } from "editor/undo_redo/change-buffer";
import { Glyph } from "editor/glyph";

var buffer: ChangeBuffer<Glyph>;

var ChangeBufferSingleton = {
    get: function() {
        if(!buffer) {
            
        }
    }
}

export default ChangeBufferSingleton;