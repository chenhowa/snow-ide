"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tsmonad_1 = require("tsmonad");
var LinkedList = /** @class */ (function () {
    function LinkedList() {
        this.front_sentinel = new LinkedListNode(tsmonad_1.Maybe.nothing(), tsmonad_1.Maybe.nothing(), tsmonad_1.Maybe.nothing());
        this.back_sentinel = new LinkedListNode(tsmonad_1.Maybe.nothing(), tsmonad_1.Maybe.nothing(), tsmonad_1.Maybe.nothing());
        // connect front sentinel to back sentinel
        this.front_sentinel.next = tsmonad_1.Maybe.just(this.back_sentinel);
        this.back_sentinel.prev = tsmonad_1.Maybe.just(this.front_sentinel);
    }
    /**
     * @description Finds first match of filter, searching from start to end.
     *              Otherwise returns iterator to end.
     * @param filter
     */
    LinkedList.prototype.find = function (filter) {
        var iterator = this.makeFrontIterator();
        var done = false;
        while (iterator.hasNext() && !done) {
            iterator.next();
            iterator.get().caseOf({
                just: function (d) {
                    if (filter(d)) {
                        done = true;
                    }
                },
                nothing: function () { }
            });
        }
        if (done) {
            return iterator;
        }
        else {
            return this.makeBackIterator();
        }
    };
    LinkedList.prototype.empty = function () {
        var iterator = this.makeFrontIterator();
        while (iterator.hasNext()) {
            iterator.removeNext();
        }
    };
    LinkedList.prototype.asArray = function () {
        var iterator = this.makeFrontIterator();
        var array = [];
        while (iterator.hasNext()) {
            iterator.next();
            array.push(iterator.grab());
        }
        return array;
    };
    // Naive implementation just counts the list. May cache in future as optimization.
    LinkedList.prototype.getCount = function () {
        var iterator = this.makeFrontIterator();
        var count = 0;
        while (iterator.hasNext()) {
            iterator.next();
            count += 1;
        }
        return count;
    };
    LinkedList.prototype.makeFrontIterator = function () {
        var iterator = new LinkedListIterator(this.front_sentinel, this);
        return iterator;
    };
    LinkedList.prototype.makeBackIterator = function () {
        var iterator = new LinkedListIterator(this.back_sentinel, this);
        return iterator;
    };
    return LinkedList;
}());
exports.LinkedList = LinkedList;
var LinkedListNode = /** @class */ (function () {
    function LinkedListNode(val, prev, next) {
        this.data = val;
        this.prev = prev;
        this.next = next;
    }
    return LinkedListNode;
}());
var LinkedListIterator = /** @class */ (function () {
    function LinkedListIterator(current, list) {
        this.current = current;
        this.list = list;
    }
    LinkedListIterator.prototype.equals = function (other) {
        return this.getCurrent() === other.getCurrent();
    };
    LinkedListIterator.prototype.getCurrent = function () {
        return this.current;
    };
    LinkedListIterator.prototype.isValid = function () {
        return tsmonad_1.Maybe.isJust(this.current.data) && !this._isSentinel();
    };
    LinkedListIterator.prototype._isSentinel = function () {
        return this._isFrontSentinel() || this._isBackSentinel();
    };
    LinkedListIterator.prototype._isFrontSentinel = function () {
        return this.current === this.list.front_sentinel;
    };
    LinkedListIterator.prototype._isBackSentinel = function () {
        return this.current === this.list.back_sentinel;
    };
    LinkedListIterator.prototype.grab = function () {
        var data;
        this.current.data.caseOf({
            just: function (d) {
                data = d;
            },
            nothing: function noValueFound() {
            }
        });
        if (!data) {
            throw new Error('Iterator grab() did not find data');
        }
        return data;
    };
    LinkedListIterator.prototype.replace = function (val) {
        if (this._isSentinel()) {
            console.log('Cannot replace value in a sentinel');
            return;
        }
        this.current.data = tsmonad_1.Maybe.just(val);
    };
    LinkedListIterator.prototype.insertBefore = function (val) {
        if (this._isFrontSentinel()) {
            console.log('Cannot insert before front sentinel');
            return;
        }
        var thisIterator = this;
        this.current.prev.caseOf({
            just: function (prevNode) {
                // prevNode -> newNode -> curr
                var newNode = new LinkedListNode(tsmonad_1.Maybe.just(val), tsmonad_1.Maybe.just(prevNode), tsmonad_1.Maybe.just(thisIterator.current));
                prevNode.next = tsmonad_1.Maybe.just(newNode);
                thisIterator.current.prev = tsmonad_1.Maybe.just(newNode);
            },
            nothing: function () {
                // We have a dangling prev. We try to repair.
                var newNode = new LinkedListNode(tsmonad_1.Maybe.just(val), tsmonad_1.Maybe.just(thisIterator.list.front_sentinel), tsmonad_1.Maybe.just(thisIterator.current));
                thisIterator.current.prev = tsmonad_1.Maybe.just(newNode);
            }
        });
    };
    LinkedListIterator.prototype.insertAfter = function (val) {
        if (this._isBackSentinel()) {
            console.log('Cannot insert after back sentinel');
            return;
        }
        var thisIterator = this;
        this.current.next.caseOf({
            just: function (nextNode) {
                // curr -> newNode -> nextNode
                var newNode = new LinkedListNode(tsmonad_1.Maybe.just(val), tsmonad_1.Maybe.just(thisIterator.current), tsmonad_1.Maybe.just(nextNode));
                nextNode.prev = tsmonad_1.Maybe.just(newNode);
                thisIterator.current.next = tsmonad_1.Maybe.just(newNode);
            },
            nothing: function () {
                // We have a dangling next. We try to repair.
                var newNode = new LinkedListNode(tsmonad_1.Maybe.just(val), tsmonad_1.Maybe.just(thisIterator.current), tsmonad_1.Maybe.just(thisIterator.list.back_sentinel));
                thisIterator.current.next = tsmonad_1.Maybe.just(newNode);
            }
        });
    };
    LinkedListIterator.prototype.remove = function (goForward) {
        if (this._isSentinel()) {
            console.log('Tried to remove sentinel');
            return;
        }
        var thisIterator = this;
        var oldCurrent = this.current; // save the actual node to be deleted.
        this.current.prev.caseOf({
            just: function (prevNode) {
                thisIterator.current.next.caseOf({
                    just: function (nextNode) {
                        // We have both prev and next, so we join them.
                        prevNode.next = tsmonad_1.Maybe.just(nextNode);
                        nextNode.prev = tsmonad_1.Maybe.just(prevNode);
                    },
                    nothing: function () {
                        // Then we have a dangling next. Since current is about to be deleted,
                        // we try to repair.
                        prevNode.next = tsmonad_1.Maybe.just(thisIterator.list.back_sentinel);
                    }
                });
            },
            nothing: function () {
                // Then we have a dangling prev. We try to repair.
                thisIterator.current.next.caseOf({
                    just: function (nextNode) {
                        nextNode.prev = tsmonad_1.Maybe.just(thisIterator.list.front_sentinel);
                    },
                    nothing: function () {
                        // We have neither a prev nor a next. Try to recover by going back to list front.
                        thisIterator.current = thisIterator.list.front_sentinel;
                    }
                });
            }
        });
        if (goForward) {
            this.current.next.caseOf({
                just: function (nextNode) {
                    thisIterator.current = nextNode;
                },
                nothing: function () {
                    // can't go forward
                }
            });
        }
        else {
            this.current.prev.caseOf({
                just: function (prevNode) {
                    thisIterator.current = prevNode;
                },
                nothing: function () {
                    // can't go backward
                }
            });
        }
        // Disconnect current so it can be GCed.
        oldCurrent.next = tsmonad_1.Maybe.nothing();
        oldCurrent.prev = tsmonad_1.Maybe.nothing();
    };
    LinkedListIterator.prototype.removeNext = function () {
        this.next();
        this.remove(false); // go backward after removing.
    };
    LinkedListIterator.prototype.removePrev = function () {
        this.prev();
        this.remove(true); // go forward after removing.
    };
    LinkedListIterator.prototype.clone = function () {
        return new LinkedListIterator(this.current, this.list);
    };
    LinkedListIterator.prototype.next = function () {
        if (this._isBackSentinel()) {
            return;
        }
        var thisIterator = this;
        this.current.next.caseOf({
            just: function (node) {
                thisIterator.current = node;
            },
            nothing: function () {
                thisIterator.current = thisIterator.list.back_sentinel;
            }
        });
    };
    LinkedListIterator.prototype.prev = function () {
        if (this._isFrontSentinel()) {
            return;
        }
        var thisIterator = this;
        this.current.prev.caseOf({
            just: function (node) {
                thisIterator.current = node;
            },
            nothing: function () {
                thisIterator.current = thisIterator.list.front_sentinel;
            }
        });
    };
    LinkedListIterator.prototype.hasNext = function () {
        var next = true;
        var thisIterator = this;
        this.current.next.caseOf({
            just: function (nextNode) {
                next = nextNode !== thisIterator.list.back_sentinel;
            },
            nothing: function () {
                next = false;
            }
        });
        return next;
    };
    LinkedListIterator.prototype.hasPrev = function () {
        var prev = true;
        var thisIterator = this;
        this.current.prev.caseOf({
            just: function (prevNode) {
                prev = prevNode !== thisIterator.list.front_sentinel;
            },
            nothing: function () {
                prev = false;
            }
        });
        return prev;
    };
    LinkedListIterator.prototype.get = function () {
        if (this.current !== this.list.front_sentinel && this.current !== this.list.back_sentinel) {
            return this.current.data;
        }
        return tsmonad_1.Maybe.nothing();
    };
    return LinkedListIterator;
}());
