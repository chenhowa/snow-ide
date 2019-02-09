import {repeat} from "voca";

var Strings = {
    tab: '\t',
    tabString: function() {
        return repeat(' ', 4);
    },
    tabName: function() {
        return 'tab';
    },
    tabSelector: function() {
        return '.' + this.tabName();
    },

    glyph: 'glyph',
    glyphName: function() {
        return this.glyph;
    },
    glyphSelector: function() {
        return "." + this.glyphName();
    },

    line: 'line',
    lineName: function() {
        return this.line;
    },
    lineSelector: function() {
        return "." + this.lineName();
    },

    editor: 'preserve-whitespace',
    editorName: function() {
        return this.editor;
    },
    editorSelector: function() {
        return "." + this.editorName();
    },

    newline: '\n',
    newlineString: function() {
        return this.newline
    },
    newlineName: function() {
        return 'hidden';
    },
    newlineSelector: function() {
        return "." + this.newlineName();
    },

    arrow: {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        up: 'ArrowUp',
        down: 'ArrowDown'
    },

    control: {
        paste: 'v',
        undo: 'z',
        redo: 'y',
        copy: 'c'
    }

}

export default Strings;