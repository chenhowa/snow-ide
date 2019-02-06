import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";

interface Handler {
    handle(event: any, iter: DoubleIterator<Glyph>): void;
    getNewIterators(): Maybe< DoubleIterator<Glyph> >;
    getEndIterator(): Maybe< DoubleIterator<Glyph> >;
}


export default Handler;