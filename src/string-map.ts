var Strings = {
    tab: '!!!!',
    tabString: function() {
        return this.tab;
        return '    ';
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
    }

}

export default Strings;