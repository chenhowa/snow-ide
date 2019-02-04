"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jquery_1 = __importDefault(require("jquery"));
var Cursor = /** @class */ (function () {
    function Cursor() {
        this.selection = window.getSelection();
    }
    /**
     * @description This function inserts a node in the current cursor's position, between its two sibling nodes, if present.
     *              Therefore the cursor must be correctly positioned
     * @param node
     */
    Cursor.prototype.insertNode = function (node) {
        if (this.selection.isCollapsed) {
            var currentNode = jquery_1.default(this.selection.anchorNode);
            if (currentNode.hasClass('preserve-whitespace')) {
                console.log('Node was editor: preserve-whitespace. INCORRECT');
                currentNode.children('.first-line').get(0).appendChild(node);
            }
            else if (currentNode.hasClass('line')) {
                currentNode.get(0).appendChild(node);
            }
            else {
                var parentNode = currentNode.parent();
                parentNode.get(0).appendChild(node);
            }
            this.moveCursorToNodeBoundary(node, false);
        }
    };
    Cursor.prototype.moveCursorToNode = function (node, offset) {
        this.selection.collapse(node, offset);
    };
    Cursor.prototype.moveCursorToNodeBoundary = function (node, toStart) {
        var range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(toStart);
        this.selection.empty();
        this.selection.addRange(range);
    };
    Cursor.prototype.maybeMoveCursorToNodeBoundary = function (maybe_node, toStart) {
        var _this = this;
        maybe_node.caseOf({
            just: function (glyph) {
                glyph.getNode().caseOf({
                    just: function (node) {
                        _this.moveCursorToNodeBoundary(node, toStart);
                        console.log("moved cursor to after the glyph");
                    },
                    nothing: function () {
                        console.log("No node. Could not move cursor to it");
                    }
                });
            },
            nothing: function () {
                console.log("No glyph. Could not move cursor to it");
            }
        });
    };
    Cursor.prototype.isCollapsed = function () {
        return this.selection.isCollapsed;
    };
    Cursor.prototype.isSelection = function () {
        return !this.selection.isCollapsed;
    };
    return Cursor;
}());
exports.default = Cursor;
