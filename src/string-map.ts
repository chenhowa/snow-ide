import {repeat} from "voca";

var Strings = {
    tab: 'Tab',
    tabString: function() {
        return repeat(' ', 4);
        return '    ';
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
    }

}

export default Strings;