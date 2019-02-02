
import $ from "jquery";
import Editor from './editor/editor';

$(document).ready(function() {
    let maybe_editor = Editor.new('#editor');
    let editor: Editor;
    maybe_editor.caseOf({
        just: function(ed) {
            editor = ed;
            editor.run();
        },
        nothing: function() {
            alert('#editor element was not found in DOM')
        }
    });
});

