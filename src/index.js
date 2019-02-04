"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jquery_1 = __importDefault(require("jquery"));
var editor_1 = __importDefault(require("./editor/editor"));
jquery_1.default(document).ready(function () {
    var maybe_editor = editor_1.default.new('#editor');
    var editor;
    maybe_editor.caseOf({
        just: function (ed) {
            editor = ed;
            editor.run();
        },
        nothing: function () {
            alert('#editor element was not found in DOM');
        }
    });
});
