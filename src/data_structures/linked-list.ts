import { Maybe } from "tsmonad";
interface List<T> {
    front_sentinel: ListNode<T>;
    back_sentinel: ListNode<T>;
    getCount(): number;
    makeFrontIterator(): DoubleIterator<T>; // put iterator one before first el of list, if any
    makeBackIterator(): DoubleIterator<T>; // put iterator one after last el of list, if any.
    asArray(): Array<T>;
    empty(): void; // empties linked list.
    find(filter: (data: T) => boolean): DoubleIterator<T>; //
}

interface ListNode<T> {
    data: Maybe<T>;
    prev: Maybe< ListNode<T> >;
    next: Maybe< ListNode<T>>;
}


interface DoubleIterator<T> {
    getCurrent(): ListNode<T>;
    clone(): DoubleIterator<T>;
    isValid(): boolean;
    next(): void;
    prev(): void;
    hasNext(): boolean;
    hasPrev(): boolean;
    get(): Maybe<T>;
    insertBefore(val: T): void; // inserts before. Does not move iterator.
    insertAfter(val: T): void; // inserts after. Does not move iterator.
    remove(forward: boolean): Maybe< LinkedListNode<T> >; // Removes current. returns node that was removed.
    removeNext(): Maybe< LinkedListNode<T> >; // Removes value after current, if it exists.
    removePrev(): Maybe< LinkedListNode<T> >; // removes node before current, if it exists.
    replace(val: T): void; // Replaces current node's value.
    grab(): T // throws an error if no value was present in the node.
    equals(other: DoubleIterator<T>) : boolean;
    findForward(filter: (data: T) => boolean): DoubleIterator<T>;
    findBackward(filter: (data: T) => boolean): DoubleIterator<T>;
    insertListAfter(list: List<T>): DoubleIterator<T>;
    insertNodeAfter(node: ListNode<T>): void;
}


class LinkedList<T> implements List<T> {
    front_sentinel: ListNode<T>;
    back_sentinel: ListNode<T>;

    constructor() {
        this.front_sentinel = new LinkedListNode<T>(Maybe.nothing(), Maybe.nothing(), Maybe.nothing());
        this.back_sentinel = new LinkedListNode<T>(Maybe.nothing(), Maybe.nothing(), Maybe.nothing());

        // connect front sentinel to back sentinel
        this.front_sentinel.next = Maybe.just(this.back_sentinel);
        this.back_sentinel.prev = Maybe.just(this.front_sentinel);
    }

    /**
     * @description Finds first match of filter, searching from start to end.
     *              Otherwise returns iterator to end.
     * @param filter 
     */
    find(filter: (data: T) => boolean ): DoubleIterator<T> {
        let iterator = this.makeFrontIterator();
        let done = false;
        while(iterator.hasNext() && !done) {
            iterator.next();
            iterator.get().caseOf({
                just: (d) => {
                    if(filter(d)) {
                        done = true;
                    }
                },
                nothing: () =>  {}
            });
        }

        if(done) {
            return iterator;
        } else {
            return this.makeBackIterator();
        }
    }

    empty(): void {
        let iterator = this.makeFrontIterator();
        while(iterator.hasNext()) {
            iterator.removeNext();
        }
    }

    asArray(): Array<T> {
        let iterator = this.makeFrontIterator();
        let array = [];
        while(iterator.hasNext()) {
            iterator.next();
            array.push(iterator.grab());
        }
        return array;
    }

    // Naive implementation just counts the list. May cache in future as optimization.
    getCount(): number {
        let iterator = this.makeFrontIterator();
        let count = 0;
        while(iterator.hasNext()) {
            iterator.next();
            count += 1;
        }
        return count;
    }

    makeFrontIterator(): DoubleIterator<T> {
        let iterator = new LinkedListIterator(this.front_sentinel, this);
        return iterator;
    }

    makeBackIterator(): DoubleIterator<T> {
        let iterator = new LinkedListIterator(this.back_sentinel, this);
        return iterator;
    }
}

class LinkedListNode<T> implements ListNode<T> {
    data: Maybe<T>;
    prev: Maybe<ListNode<T>>;
    next: Maybe<ListNode<T>>;

    constructor(val: Maybe<T>, prev: Maybe< ListNode<T> >, next: Maybe< ListNode<T> >) {
        this.data = val;
        this.prev = prev;
        this.next = next;
    }
}

class LinkedListIterator<T> implements DoubleIterator<T> {
    list: LinkedList<T>;
    current: LinkedListNode<T>;

    constructor(current: LinkedListNode<T>, list : LinkedList<T>) {
        this.current = current;
        this.list = list;
    }


    /**
     * @description takes a list and inserts all its nodes into the iterator's list. 
     * @param list  - this list is destroyed as a result.
     * @returns iterator pointing to node AFTER the last inserted node.
     */
    insertListAfter(list: List<T>): DoubleIterator<T> {
        if(this._isBackSentinel()) {
            throw new Error("Tried to insert list after back sentinel");
        }

        let remover = list.makeFrontIterator();
        let inserter = this.clone();
        while(remover.hasNext()) {
            let maybe_node = remover.removeNext(); // remove node from list so we can put it in current list.
            maybe_node.caseOf({
                just: (node) => {
                    // If the node exists, insert it.
                    inserter.insertNodeAfter(node);
                    inserter.next();
                },
                nothing: () => {}
            })
        }

        // Once done, we return an iterator to the node ONE AFTER all that has been inserted.
        inserter.next();
        return inserter;
    }

    insertNodeAfter(node: ListNode<T>): void {
        this.current.next.caseOf({
            just: (nextNode) => {
                node.next = Maybe.just(nextNode);
                nextNode.prev = Maybe.just(node);
            },
            nothing: () => {
                // If current has no next, we're probably in trouble. We can't really repair in any way.
                throw new Error("insertNodeAfter: this iterator's list has been corrupted");
            }
        });
        node.prev = Maybe.just(this.current);
        this.current.next = Maybe.just(node);
    }

    /**
     * @description Finds first occurence at or after this iterator.
     * @param filter 
     */
    findForward(filter: (data: T) => boolean): DoubleIterator<T> {
        let iter = this.clone();
        let found = false;

        if(!iter.isValid()) {
            // If we are in a sentinel or something, go forward one.
            iter.next();
        }

        while( iter.isValid() && !found ) {
            iter.get().caseOf({
                just: (val) => {
                    if(filter(val)) {
                        found = true;
                    } else {
                        iter.next();
                    }
                },
                nothing: () => {
                    iter.next();
                }
            });
        }
        return iter;
    }

    /**
     * @description Finds first occurence at or before this iterator.
     * @param filter 
     */
    findBackward(filter: (data: T) => boolean): DoubleIterator<T> {


        let iter = this.clone();
        let found = false;

        if(!iter.isValid()) {
            iter.prev();  // Try going backward if it isn't valid. Maybe it's at a back sentinel.
        }

        while( iter.isValid() && !found ) {
            iter.get().caseOf({
                just: (val) => {
                    if(filter(val)) {
                        found = true;
                    } else {
                        iter.prev();
                    }
                },
                nothing: () => {
                    iter.prev();
                }
            })
        }
        return iter;
    }

    equals(other: DoubleIterator<T>): boolean {
        return this.getCurrent() === other.getCurrent();
    }

    getCurrent(): ListNode<T> {
        return this.current;
    }

    isValid(): boolean {
        return Maybe.isJust(this.current.data) && !this._isSentinel();
    }

    _isSentinel(): boolean {
        return this._isFrontSentinel() || this._isBackSentinel();
    }

    _isFrontSentinel(): boolean {
        return this.current === this.list.front_sentinel;
    }

    _isBackSentinel(): boolean {
        return this.current === this.list.back_sentinel;
    }

    grab(): T {
        let data: T | undefined;
        this.current.data.caseOf({
            just: function(d) {
                data = d;
            },
            nothing: function noValueFound() {
                
            }
        });

        if(!data) {
            throw new Error('Iterator grab() did not find data');
        } 

        return data;
    }

    replace(val: T): void {
        if(this._isSentinel()) {
            console.log('Cannot replace value in a sentinel');
            return;
        }

        this.current.data = Maybe.just(val);
    }

    insertBefore(val: T): void {
        if(this._isFrontSentinel()) {
            console.log('Cannot insert before front sentinel');
            return;
        }

        let thisIterator = this;
        this.current.prev.caseOf({
            just: function(prevNode) {
                // prevNode -> newNode -> curr
                let newNode = new LinkedListNode(Maybe.just(val), Maybe.just(prevNode), Maybe.just(thisIterator.current));
                prevNode.next = Maybe.just(newNode);
                thisIterator.current.prev = Maybe.just(newNode);
            },
            nothing: function() {
                // We have a dangling prev. We try to repair.
                let newNode = new LinkedListNode(Maybe.just(val), Maybe.just(thisIterator.list.front_sentinel), Maybe.just(thisIterator.current));
                thisIterator.current.prev = Maybe.just(newNode);
            }
        });
    }

    insertAfter(val: T): void {
        if(this._isBackSentinel()) {
            console.log('Cannot insert after back sentinel');
            return;
        }

        let thisIterator = this;
        this.current.next.caseOf({
            just: function(nextNode) {
                // curr -> newNode -> nextNode
                let newNode = new LinkedListNode(Maybe.just(val), Maybe.just(thisIterator.current), Maybe.just(nextNode));
                nextNode.prev = Maybe.just(newNode);
                thisIterator.current.next = Maybe.just(newNode);
            },
            nothing: function() {
                // We have a dangling next. We try to repair.
                let newNode = new LinkedListNode(Maybe.just(val), Maybe.just(thisIterator.current), Maybe.just(thisIterator.list.back_sentinel));
                thisIterator.current.next = Maybe.just(newNode);
            }
        });
    }

    remove(goForward: boolean): Maybe< LinkedListNode<T> > {
        if(this._isSentinel()) {
            console.log('Tried to remove sentinel');
            return Maybe.nothing();
        }

        let thisIterator = this;
        let oldCurrent = this.current;  // save the actual node to be deleted.
        this.current.prev.caseOf({
            just: function(prevNode) {
                thisIterator.current.next.caseOf({
                    just: function(nextNode) {
                        // We have both prev and next, so we join them.
                        prevNode.next = Maybe.just(nextNode);
                        nextNode.prev = Maybe.just(prevNode);
                    },
                    nothing: function() {
                        // Then we have a dangling next. Since current is about to be deleted,
                        // we try to repair.
                        prevNode.next = Maybe.just(thisIterator.list.back_sentinel);
                    }
                })
            },
            nothing: function() {
                // Then we have a dangling prev. We try to repair.

                thisIterator.current.next.caseOf({
                    just: function(nextNode) {
                        nextNode.prev = Maybe.just(thisIterator.list.front_sentinel);
                    },
                    nothing: function() {
                        // We have neither a prev nor a next. Try to recover by going back to list front.
                        thisIterator.current = thisIterator.list.front_sentinel;
                    }
                });
            }
        });

        if(goForward) {
            this.current.next.caseOf({
                just: function(nextNode) {
                    thisIterator.current = nextNode;
                },
                nothing: function() {
                    // can't go forward
                }
            });
        } else {
            this.current.prev.caseOf({
                just: function(prevNode) {
                        thisIterator.current = prevNode;
                },
                nothing: function() {
                    // can't go backward
                }
            });
        }

        // Disconnect current
        oldCurrent.next = Maybe.nothing();
        oldCurrent.prev = Maybe.nothing();

        return Maybe.just(oldCurrent);
    }

    removeNext(): Maybe< LinkedListNode<T> > {
        this.next();
        return this.remove(false); // go backward after removing.
    }

    removePrev(): Maybe< LinkedListNode<T> > {
        this.prev();
        return this.remove(true); // go forward after removing.
    }

    clone(): DoubleIterator<T> {
        return new LinkedListIterator(this.current, this.list);
    }

    next(): void {
        if(this._isBackSentinel()) {
            return;
        }

        let thisIterator = this;
        this.current.next.caseOf({
            just: function(node) {
                thisIterator.current = node;
            },
            nothing: function() {
                thisIterator.current = thisIterator.list.back_sentinel;
            }
        });
    }

    prev(): void {
        if(this._isFrontSentinel()) {
            return;
        }

        let thisIterator = this;
        this.current.prev.caseOf({
            just: function(node) {
                thisIterator.current = node;
            },
            nothing: function() {
                thisIterator.current = thisIterator.list.front_sentinel;
            }
        });
    }

    hasNext(): boolean {
        let next = true;
        let thisIterator = this;
        this.current.next.caseOf({
            just: function(nextNode) {
                next =  nextNode !== thisIterator.list.back_sentinel;
            },
            nothing: function(){
                next = false;
            }
        });
        return next;
    }

    hasPrev(): boolean {
        let prev = true;
        let thisIterator = this;
        this.current.prev.caseOf({
            just: function(prevNode) {
                prev = prevNode !== thisIterator.list.front_sentinel;
            }, 
            nothing: function() {
                prev = false;
            }
        })
        return prev;
    }

    get(): Maybe<T> {
        if(this.current !== this.list.front_sentinel && this.current !== this.list.back_sentinel) {
            return this.current.data;
        }

        return Maybe.nothing();
    }
}

export { 
    LinkedList, 
    List, 
    ListNode, 
    DoubleIterator
};