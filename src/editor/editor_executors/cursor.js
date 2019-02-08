"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jquery_1 = __importDefault(require("jquery"));
var string_map_1 = __importDefault(require("string-map"));
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
        var newNode = jquery_1.default(node);
        if (newNode.hasClass(string_map_1.default.lineName())) {
            this.insertLine(newNode);
        }
        else if (newNode.hasClass(string_map_1.default.glyphName())) {
            this.insertGlyph(newNode);
        }
    };
    Cursor.prototype.insertLine = function (new_line) {
        if (this.selection.isCollapsed) {
            var currentNode = jquery_1.default(this.selection.anchorNode);
            if (currentNode.hasClass(string_map_1.default.editorName())) {
                console.log('Node was editor: preserve-whitespace. INCORRECT');
                if (currentNode.contents().length > 0) {
                    new_line.insertBefore(currentNode.contents().get(0));
                }
                else {
                    currentNode.get(0).appendChild(new_line.get(0));
                }
            }
            else if (currentNode.hasClass(string_map_1.default.lineName())) {
                new_line.insertAfter(currentNode);
            }
            else if (currentNode.hasClass(string_map_1.default.glyphName())) {
                console.log('inserting line after glyph');
                // in a span. So we need to go up to the line and execute
                var lineNode = currentNode.parent(string_map_1.default.lineSelector());
                console.log(lineNode);
                new_line.insertAfter(lineNode);
            }
            else {
                throw new Error("insertLine: currentNode not yet recognized");
            }
            this.moveCursorToNodeBoundary(new_line.get(0), false);
        }
    };
    Cursor.prototype.insertGlyph = function (new_glyph) {
        if (this.selection.isCollapsed) {
            var currentNode = jquery_1.default(this.selection.anchorNode);
            if (currentNode.hasClass(string_map_1.default.editorName())) {
                console.log('Node was editor: preserve-whitespace. INCORRECT');
                // need to find the line and insert if possible. Otherwise throw error.
                var firstLine = currentNode.children(string_map_1.default.lineSelector()).first();
                if (firstLine.length > 0) {
                    // guaranteed to have a span.
                    new_glyph.insertBefore(firstLine.contents().first());
                }
                else {
                    throw new Error("NO FIRST LINE in insertGlyph");
                }
            }
            else if (currentNode.hasClass(string_map_1.default.lineName())) {
                // If cursor is in line, there should be a span containing newline. Insert!
                new_glyph.insertAfter(currentNode.children(string_map_1.default.glyphSelector()).last());
            }
            else if (currentNode.hasClass(string_map_1.default.glyphName())) {
                new_glyph.insertAfter(currentNode);
            }
            else {
                throw new Error('insertGlyph: current Node not yet supported');
            }
            this.moveCursorToNodeBoundary(new_glyph.get(0), false);
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
