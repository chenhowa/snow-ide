
import { Observable } from "rxjs";
import { map } from "rxjs/operators";


import { DoubleIterator, LinkedList } from 'data_structures/linked-list';
import { Glyph, GlyphStyle } from "editor/glyph";


interface StyleResult {
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
    style: GlyphStyle;
}

interface TokenStyleMapper {
    map(token: string ): GlyphStyle;
}

interface TokenizerResult {
    token_name: string;
    start: DoubleIterator<Glyph>;
    end: DoubleIterator<Glyph>;
}

interface Tokenizer {
    feed(char_iter: DoubleIterator<Glyph>): undefined | TokenizerResult;
}



let lexer_style: Observable< StyleResult | undefined >;


let LexerStyle = {
    get: function(obs: Observable<DoubleIterator<Glyph>>, mapper: TokenStyleMapper, tokenizer: Tokenizer): Observable< StyleResult | undefined> {
        if(!lexer_style) {
            lexer_style = createStyler(obs, mapper, tokenizer);
        }

        return lexer_style;
    }
}

function createStyler(obs: Observable<DoubleIterator<Glyph>>, mapper: TokenStyleMapper, tokenizer: Tokenizer): Observable<StyleResult | undefined> {
    let styler = obs.pipe(map((iter) => {
        let token_result: TokenizerResult | undefined = tokenizer.feed(iter);
        let result: StyleResult | undefined = undefined;

        if(token_result) {
            result = {
                start: token_result.start.clone(),
                end: token_result.end.clone(),
                style: mapper.map(token_result.token_name)
            }
        } 

        return result;
    }));

    return styler;

    

}

export default LexerStyle;
export { LexerStyle, StyleResult, Tokenizer, TokenStyleMapper, TokenizerResult };