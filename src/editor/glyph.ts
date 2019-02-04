import $ from "jquery";
import { Maybe } from "tsmonad";


// This interface implies that something can be converted to a Node (with children, etc);
interface ToNode {
    toNode(): Node;
    destroyNode(): void;
    getNode(): Maybe<Node>;
}

// this interface represents all the supported styles that a Glyph can render
interface Style {

}

class Glyph implements ToNode {
    glyph: string;
    style: Style;
    node: Maybe<Node>;

    constructor(glyph: string, style: Style) {
        this.glyph = glyph;
        this.style = style;
        this.node = Maybe.nothing();
    }

    getNode(): Maybe<Node> {
        return this.node;
    }

    toNode(): Node {
        let span = $("<span></span>");
        span.text(this.glyph);
        let node = span.get(0);
        this.node = Maybe.just(node);
        return node;
    }

    destroyNode(): void {
        this.node.caseOf({
            just: (node) => {
                $(node).remove();
                this.node = Maybe.nothing();
            },
            nothing: () => {
                // Do nothing. Nothing to destroy.
            }
        })
    }
}

class GlyphStyle implements Style {
    constructor() {
        
    }
}



export { Glyph, ToNode, Style, GlyphStyle};