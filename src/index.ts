
import $ from "jquery";
import Editor from './editor/editor';
import HistorySingleton from "editor/singletons/history-singleton";

$(document).ready(function() {
    let maybe_editor = Editor.new('#editor');
    let editor: Editor;
    maybe_editor.caseOf({
        just: function(ed) {
            editor = ed;
            editor.run();

            $("#reset").click(function(event) {
                editor.reset();
            });

            $("#show-glyphs").click(function(event) {
                console.log(editor.getDocument());
            });

            $("#re-render").click(function(event) {
                editor.rerender();
            });

            $("#history").click(function(event) {
                console.log(HistorySingleton.get().asArray());
            })

            $("#buffer").click(function(event) {
                console.log(editor.showBuffer());
            });
        },
        nothing: function() {
            alert('#editor element was not found in DOM')
        }
    });
});

