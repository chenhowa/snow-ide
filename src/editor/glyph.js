"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jquery_1 = __importDefault(require("jquery"));
var tsmonad_1 = require("tsmonad");
var Glyph = /** @class */ (function () {
    function Glyph(glyph, style) {
        this.glyph = glyph;
        this.style = style;
        this.node = tsmonad_1.Maybe.nothing();
    }
    Glyph.prototype.getNode = function () {
        return this.node;
    };
    Glyph.prototype.toNode = function () {
        var span = jquery_1.default("<span></span>");
        span.text(this.glyph);
        var node = span.get(0);
        this.node = tsmonad_1.Maybe.just(node);
        return node;
    };
    Glyph.prototype.destroyNode = function () {
        var _this = this;
        this.node.caseOf({
            just: function (node) {
                jquery_1.default(node).remove();
                _this.node = tsmonad_1.Maybe.nothing();
            },
            nothing: function () {
                // Do nothing. Nothing to destroy.
            }
        });
    };
    return Glyph;
}());
exports.Glyph = Glyph;
var GlyphStyle = /** @class */ (function () {
    function GlyphStyle() {
    }
    return GlyphStyle;
}());
exports.GlyphStyle = GlyphStyle;
