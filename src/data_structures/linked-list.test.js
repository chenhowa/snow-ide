"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jest");
var linked_list_1 = require("data_structures/linked-list");
describe('Validate insertion behavior', function () {
    describe('from front of list', function () {
        var list = new linked_list_1.LinkedList();
        var iterator = list.makeFrontIterator();
        beforeEach(function () {
            list = new linked_list_1.LinkedList();
            iterator = list.makeFrontIterator();
            validate_initial_list(list);
        });
        test('insertAfter', function () {
            var vals = [1, 2, 3];
            for (var i = 0; i < vals.length; i++) {
                iterator.insertAfter(vals[i]);
            }
            expect(list.asArray()).toEqual([3, 2, 1]);
        });
        test('insertBefore', function () {
            var vals = [1, 2, 3];
            for (var i = 0; i < vals.length; i++) {
                iterator.insertBefore(vals[i]);
            }
            expect(list.asArray()).toEqual([]);
        });
    });
    describe('from back of list', function () {
        var list = new linked_list_1.LinkedList();
        var iterator = list.makeBackIterator();
        beforeEach(function () {
            list = new linked_list_1.LinkedList();
            iterator = list.makeBackIterator();
            validate_initial_list(list);
        });
        test('insertAfter', function () {
            var vals = [1, 2, 3];
            for (var i = 0; i < vals.length; i++) {
                iterator.insertAfter(vals[i]);
            }
            expect(list.asArray()).toEqual([]);
        });
        test('insertBefore', function () {
            var vals = [1, 2, 3];
            for (var i = 0; i < vals.length; i++) {
                iterator.insertBefore(vals[i]);
            }
            expect(list.asArray()).toEqual([1, 2, 3]);
        });
    });
});
describe('Validate removal behavior', function () {
    var list = new linked_list_1.LinkedList();
    beforeEach(function () {
        list = new linked_list_1.LinkedList();
        validate_initial_list(list);
    });
    test('remove from front of list', function () {
        var arr = [1, 2, 3];
        var iterator = list.makeFrontIterator();
        linked_list_1.populate_list(list, arr);
        var goForward = false;
        var index = 0;
        while (iterator.hasNext()) {
            iterator.next();
            expect(iterator.grab()).toBe(arr[index]);
            index += 1;
            iterator.remove(goForward); // Need to remove false to move backward so that next iteration's next() will go correctly.
        }
        expect(list.asArray()).toEqual([]);
    });
    test('remove from back of list', function () {
        var iterator = list.makeBackIterator();
        var arr = [1, 2, 3];
        linked_list_1.populate_list(list, arr);
        var index = 2;
        while (iterator.hasPrev()) {
            iterator.prev();
            expect(iterator.grab()).toBe(arr[index]);
            index -= 1;
            iterator.remove(true); // Need to remove true to move forward so that next iteration's prev() will go correctly.
        }
        expect(list.asArray()).toEqual([]);
    });
    test('empty list like a trash can', function () {
        var arr = [1, 2, 3];
        linked_list_1.populate_list(list, arr);
        expect(list.getCount()).toEqual(arr.length);
        list.empty();
        expect(list.getCount()).toEqual(0);
    });
});
describe('validate list insertion', function () {
    test('empty and full', function () {
        var empty_list = new linked_list_1.LinkedList();
        var full_list = new linked_list_1.LinkedList();
        linked_list_1.populate_list(full_list, [1, 2, 3]);
        var iter = empty_list.makeFrontIterator();
        iter.insertListAfter(full_list);
        expect(empty_list.asArray()).toEqual([1, 2, 3]);
        expect(full_list.asArray()).toEqual([]);
    });
});
function validate_initial_list(list) {
    var front_iterator = list.makeFrontIterator();
    expect(front_iterator.hasNext()).toBe(false);
    expect(front_iterator.hasPrev()).toBe(false);
    var back_iterator = list.makeBackIterator();
    expect(back_iterator.hasNext()).toBe(false);
    expect(back_iterator.hasPrev()).toBe(false);
}
