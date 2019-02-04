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
        let node_to_add: Node;

        let span = $("<span></span>");
        span.addClass('glyph');
        span.text(this.glyph);

        if(this.glyph === '\n') {
            // if newline, wrap span in a newline div
            span.addClass('hidden');
            let line = $("<div></div>");
            line.addClass('line');
            line.append(span);
            node_to_add = line.get(0);
        } else {
            node_to_add = span.get(0);
        }

        this.node = Maybe.just(node_to_add);
        return node_to_add;
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