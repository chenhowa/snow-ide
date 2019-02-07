import { Maybe } from "tsmonad";
import { DoubleIterator } from "data_structures/linked-list";
import { Glyph } from "editor/glyph";

interface Handler {
    handle(event: any, start_iter: DoubleIterator<Glyph>, end_iter: DoubleIterator<Glyph>): void;
    getStartIterator(): Maybe< DoubleIterator<Glyph> >;
    getEndIterator(): Maybe< DoubleIterator<Glyph> >;
}


export default Handler;