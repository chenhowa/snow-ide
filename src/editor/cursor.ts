

class Cursor {
    selection: Selection;

    constructor() {
        this.selection = window.getSelection();
    }

    moveCursorToNode(node: Node, offset: number) {
        this.selection.collapse(node, offset);
    }

    moveCursorToNodeBoundary(node: Node, toStart: boolean) {
        let range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(toStart);
        this.selection.empty();
        this.selection.addRange(range);
    }
}

export default Cursor;