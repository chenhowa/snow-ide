import "jest";
import { LinkedList } from "./linked-list";


describe('Validate insertion behavior', () => {
    describe('from front of list', () => {
        let list: LinkedList<number> = new LinkedList();
        let iterator = list.makeFrontIterator();
        beforeEach(() => {
            list = new LinkedList();
            iterator = list.makeFrontIterator();
            validate_initial_list(list);
        });

        test('insertAfter', () => {
            let vals = [1, 2, 3];
            for(let i = 0; i < vals.length; i++) {
                iterator.insertAfter(vals[i]);
            }
            expect(list.asArray()).toEqual([3, 2, 1]);
        });

        test('insertBefore', () => {
            let vals = [1, 2, 3];
            for(let i = 0; i < vals.length; i++) {
                iterator.insertBefore(vals[i]);
            }
            expect(list.asArray()).toEqual([]);
        });
    });

    describe('from back of list', () => {
        let list: LinkedList<number> = new LinkedList();
        let iterator = list.makeBackIterator();
        beforeEach(() => {
            list = new LinkedList();
            iterator = list.makeBackIterator();
            validate_initial_list(list);
        });

        test('insertAfter', () => {
            let vals = [1, 2, 3];
            for(let i = 0; i < vals.length; i++) {
                iterator.insertAfter(vals[i]);
            }
            expect(list.asArray()).toEqual([]);
        });

        test('insertBefore', () => {
            let vals = [1, 2, 3];
            for(let i = 0; i < vals.length; i++) {
                iterator.insertBefore(vals[i]);
            }
            expect(list.asArray()).toEqual([1, 2, 3]);
        });
    })
});

describe('Validate removal behavior', () => {
    let list: LinkedList<number> = new LinkedList();

    beforeEach(() => {
        list = new LinkedList();
        validate_initial_list(list);
    });

    test('remove from front of list', () => {
        let arr = [1, 2, 3];
        let iterator = list.makeFrontIterator();
        populate_list(list, arr);
        let goForward = false;
        let index = 0;
        while(iterator.hasNext()) {
            iterator.next();
            expect(iterator.grab()).toBe(arr[index]);
            index += 1;
            iterator.remove(goForward); // Need to remove false to move backward so that next iteration's next() will go correctly.
        }
        expect(list.asArray()).toEqual([]);
    });

    test('remove from back of list', () => {
        let iterator = list.makeBackIterator();
        let arr = [1, 2, 3];
        populate_list(list, arr);
        let index = 2;
        while(iterator.hasPrev()) {
            iterator.prev();
            expect(iterator.grab()).toBe(arr[index]);
            index -= 1;
            iterator.remove(true); // Need to remove true to move forward so that next iteration's prev() will go correctly.
        }
        expect(list.asArray()).toEqual([]);
    });

    test('empty list like a trash can', () => {
        let arr = [1, 2, 3];
        populate_list(list, arr);
        expect(list.getCount()).toEqual(arr.length);
        list.empty();
        expect(list.getCount()).toEqual(0);
    })
});


function validate_initial_list<T>(list: LinkedList<T>) {
    let front_iterator = list.makeFrontIterator();
    expect(front_iterator.hasNext()).toBe(false);
    expect(front_iterator.hasPrev()).toBe(false);


    let back_iterator = list.makeBackIterator();
    expect(back_iterator.hasNext()).toBe(false);
    expect(back_iterator.hasPrev()).toBe(false);
}

function populate_list<T>(list: LinkedList<T>, arr: Array<T>) {
    let iterator = list.makeFrontIterator();
    for(var i = 0; i < arr.length; i++) {
        iterator.insertAfter(arr[i]);
        iterator.next(); // since insert does not move iterator.
    }
}
