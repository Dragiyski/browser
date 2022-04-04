import { Platform } from '@dragiyski/web-platform';
import {
    validateNativeInvocation,
    validateClassInvocation,
    validateClassImplementation,
    minimumNumberOfMethodArguments,
    minimumNumberOfConstructorArguments
} from './interceptors.js';
import { performance } from 'perf_hooks';

/**
 * @param {Platform} platform 
 */
export default function (platform) {
    const agent = platform.implementationOf(platform);
    const { DOM } = agent;

    DOM.Event = class Event {
        constructor() {
            this.type = '';
            this.isTrusted = false;
            this.eventPhase = DOM.Event.phase.NONE;
            this.stopPropagationFlag = false;
            this.stopImmediatePropagationFlag = false;
            this.canceledFlag = false;
            this.inPassiveListenerFlag = false;
            this.initializedFlag = false;
            this.dispatchFlag = false;
            this.target = null;
            this.currentTarget = null;
            this.relatedTarget = null;
            this.touchTargetList = [];
            this.path = [];
        }

        /**
         * @see https://dom.spec.whatwg.org/#dom-event-composedpath
         * @returns Array
         */
        composedPath() {
            let composedPath = new platform.primordials.Array();
            let path = this.path;
            if (path.length <= 0) {
                return composedPath;
            }
            let currentTarget = this.currentTarget;
            platform.call(platform.primordials['Array.prototype.push'], composedPath, platform.interfaceOf(currentTarget));
            let currentTargetIndex = 0;
            let currentTargetHiddenSubtreeLevel = 0;
            let index = path.length - 1;
            while (index >= 0) {
                if (path[index].rootOfClosedTree) {
                    ++currentTargetHiddenSubtreeLevel;
                }
                if (path[index].invocationTarget === currentTarget) {
                    currentTargetIndex = index;
                    break;
                }
                if (path[index].slotInClosedTree) {
                    --currentTargetHiddenSubtreeLevel;
                }
                --index;
            }
            let currentHiddenLevel = currentTargetHiddenSubtreeLevel;
            let maxHiddenLevel = currentTargetHiddenSubtreeLevel;
            index = currentTargetIndex - 1;
            while (index >= 0) {
                if (path[index].rootOfClosedTree) {
                    --currentHiddenLevel;
                }
                if (currentHiddenLevel <= maxHiddenLevel) {
                    platform.call(platform.primordials['Array.prototype.unshift'], composedPath, platform.interfaceOf(path[index].invocationTarget));
                }
                if (path[index].slotInClosedTree) {
                    --currentHiddenLevel;
                    if (currentHiddenLevel < maxHiddenLevel) {
                        maxHiddenLevel = currentHiddenLevel;
                    }
                }
                --index;
            }
            maxHiddenLevel = currentHiddenLevel = currentTargetHiddenSubtreeLevel;
            index = currentTargetIndex + 1;
            while (index < path.length) {
                if (path[index].slotInClosedTree) {
                    ++currentHiddenLevel;
                }
                if (currentHiddenLevel <= maxHiddenLevel) {
                    platform.call(platform.primordials['Array.prototype.push'], composedPath, platform.interfaceOf(path[index].invocationTarget));
                }
                if (path[index].rootOfClosedTree) {
                    --currentHiddenLevel;
                    if (currentHiddenLevel < maxHiddenLevel) {
                        maxHiddenLevel = currentHiddenLevel;
                    }
                }
                ++index;
            }
            return composedPath;
        }

        /**
         * @see https://dom.spec.whatwg.org/#set-the-canceled-flag
         */
        setTheCanceledFlag() {
            if (this.cancelable && !this.inPassiveListenerFlag) {
                this.canceledFlag = true;
            }
        }

        static createEventInit(eventInitDict = Object.create(null)) {
            const internalEventInitDict = Object.create(null);
            for (const name in this.defaultEventInit) {
                internalEventInitDict[name] = this.defaultEventInit[name];
            }
            if (eventInitDict === Object(eventInitDict)) {
                for (const name in internalEventInitDict) {
                    if (Object.prototype.hasOwnProperty.call(eventInitDict, name)) {
                        internalEventInitDict[name] = this.processEventInitProperty(eventInitDict[name]);
                    }
                }
            }
            return internalEventInitDict;
        }

        static create(event, type, eventInitDict = Object.create(null)) {
            const internalEventInitDict = this.createEventInit(eventInitDict);
            const self = this.innerEventCreationSteps(event, null, internalEventInitDict);
            self.type = type + '';
            this.initUnforgeables(event);
            return self;
        }

        static createAnEvent() {
        }

        static innerEventCreationSteps(object, time = null, dictionary = Object.create(null)) {
            if (time == null) {
                time = performance.timeOrigin + performance.now();
            }
            const event = new this();
            platform.setImplementation(object, event);

            event.initializedFlag = true;
            event.timeStamp = time;
            for (const member in dictionary) {
                if (Object.prototype.hasOwnProperty.call(dictionary, member)) {
                    const value = dictionary[member];
                    event[member] = value;
                }
            }
            if (typeof this.eventConstructingSteps === 'function') {
                this.eventConstructingSteps(event, dictionary);
            }
            return event;
        }

        initialize(type, bubbles, cancelable) {
            this.initializedFlag = true;
            this.stopPropagationFlag = this.stopImmediatePropagationFlag = this.canceledFlag = false;
            this.isTrusted = false;
            this.target = null;
            this.type = type + '';
            this.bubbles = Boolean(bubbles);
            this.cancelable = Boolean(cancelable);
        }

        /**
             * Register the [[LegacyUnforgeable]] properties of an Event interface.
             * @see {@link https://heycam.github.io/webidl/#LegacyUnforgeable}
             * @param event
             */
        static initUnforgeables(event) {
            Object.defineProperties(event, {
                isTrusted: {
                    configurable: false,
                    enumerable: true,
                    get: this.unforgeables.isTrusted
                }
            });
        }
    };
    DOM.Event.phase = Object.assign(Object.create(null), {
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3
    });
    DOM.Event.defaultEventInit = Object.assign(Object.create(null), {
        bubbles: false,
        cancelable: false,
        composed: false
    });
    DOM.Event.processEventInitProperty = {
        bubbles: Boolean,
        cancelable: Boolean,
        composed: Boolean
    };

    const Event = platform.function(function Event(type, eventInitDict = Object.create(null)) {
        DOM.Event.create(this, type, eventInitDict);
        return this;
    }, {
        name: 'Event',
        length: 1,
        allowNew: true,
        before: [validateClassInvocation('Event'), validateClassImplementation(DOM.Event), minimumNumberOfConstructorArguments(1, 'Event')]
    });

    DOM.Event.unforgeables = {
        isTrusted: platform.function(function isTrusted() {
            return this.isTrusted;
        }, {
            before: [validateNativeInvocation(Event, DOM.Event), Platform.unwrapThisInterceptor],
            allowNew: false,
            name: 'isTrusted'
        })
    };

    const methodOptions = {
        before: [validateNativeInvocation(Event, DOM.Event), Platform.unwrapThisInterceptor],
        allowNew: false
    };

    const Event_getTarget = function target() {
        return this.target;
    }

    Event.prototype = Object.create(platform.primordials['Object.prototype'], {
        constructor: {
            configurable: true,
            writable: true,
            value: Event
        },
        type: {
            configurable: true,
            enumerable: true,
            get: platform.function(function type() {
                return this.type;
            }, {
                ...methodOptions,
                name: 'type'
            })
        },
        target: {
            configurable: true,
            enumerable: true,
            get: platform.function(Event_getTarget, {
                ...methodOptions,
                name: 'target',
                after: Platform.wrapOwnReturnValueInterceptor
            })
        },
        srcElement: {
            configurable: true,
            enumerable: true,
            get: platform.function(Event_getTarget, {
                ...methodOptions,
                name: 'srcElement',
                after: Platform.wrapOwnReturnValueInterceptor
            })
        },
        currentTarget: {
            configurable: true,
            enumerable: true,
            get: platform.function(function currentTarget() {
                return this.currentTarget;
            }, {
                ...methodOptions,
                name: 'currentTarget',
                after: Platform.wrapOwnReturnValueInterceptor
            })
        },
        composedPath: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(function composedPath() {
                return this.composedPath();
            }, {
                ...methodOptions,
                name: 'composedPath'
            })
        },
        eventPhase: {
            configurable: true,
            enumerable: true,
            get: platform.function(function eventPhase() {
                return this.eventPhase;
            }, {
                ...methodOptions,
                name: 'eventPhase'
            })
        },
        eventPhase: {
            configurable: true,
            enumerable: true,
            get: platform.function(function eventPhase() {
                return this.eventPhase;
            }, {
                ...methodOptions,
                name: 'eventPhase'
            })
        },
        stopPropagation: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(function stopPropagation() {
                this.stopPropagationFlag = true;
            }, {
                ...methodOptions,
                name: 'stopPropagation'
            })
        },
        cancelBubble: {
            configurable: true,
            enumerable: true,
            get: platform.function(function cancelBubble() {
                return this.stopPropagationFlag;
            }, {
                ...methodOptions,
                name: 'cancelBubble'
            }),
            set: platform.function(function cancelBubble(value) {
                if (value) {
                    this.stopPropagationFlag = true;
                }
            }, {
                ...methodOptions,
                name: 'cancelBubble'
            })
        },
        stopImmediatePropagation: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(function stopImmediatePropagation() {
                this.stopPropagationFlag = true;
                this.stopImmediatePropagationFlag = true;
            }, {
                ...methodOptions,
                name: 'stopImmediatePropagation'
            })
        },
        bubbles: {
            configurable: true,
            enumerable: true,
            get: platform.function(function bubbles() {
                return this.bubbles;
            }, {
                ...methodOptions,
                name: 'bubbles'
            })
        },
        cancelable: {
            configurable: true,
            enumerable: true,
            get: platform.function(function cancelable() {
                return this.cancelable;
            }, {
                ...methodOptions,
                name: 'cancelable'
            })
        },
        returnValue: {
            configurable: true,
            enumerable: true,
            get: platform.function(function returnValue() {
                return this.canceledFlag;
            }, {
                ...methodOptions,
                name: 'returnValue'
            }),
            set: platform.function(function returnValue(value) {
                if (!value) {
                    this.setTheCanceledFlag();
                }
            }, {
                ...methodOptions,
                name: 'returnValue'
            })
        },
        preventDefault: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(function preventDefault() {
                this.setTheCanceledFlag();
            }, {
                ...methodOptions,
                name: 'preventDefault'
            })
        },
        defaultPrevented: {
            configurable: true,
            enumerable: true,
            get: platform.function(function defaultPrevented() {
                return this.canceledFlag;
            }, {
                ...methodOptions,
                name: 'defaultPrevented'
            })
        },
        composed: {
            configurable: true,
            enumerable: true,
            get: platform.function(function composed() {
                return this.composed;
            }, {
                ...methodOptions,
                name: 'composed'
            })
        },
        timeStamp: {
            configurable: true,
            enumerable: true,
            get: platform.function(function timeStamp() {
                return this.timeStamp;
            }, {
                ...methodOptions,
                name: 'timeStamp'
            })
        },
        initEvent: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(function initEvent(type, bubbles = false, cancelable = false) {
                if (this.dispatchFlag) {
                    return;
                }
                this.initialize(type, bubbles, cancelable);
            }, {
                ...methodOptions,
                before: [...methodOptions.before, minimumNumberOfMethodArguments(1, 'initEvent', 'Event')],
                name: 'initEvent'
            })
        }
    });

    for (const name in DOM.Event.phase) {
        for (const target of [Event, Event.prototype]) {
            Object.defineProperty(target, name, {
                enumerable: true,
                value: DOM.Event.phase[name]
            });
        }
    }

    platform.setImplementation(Event, DOM.Event);
    platform.setImplementation(Event.prototype, DOM.Event.prototype);

    Object.defineProperty(platform.global, 'Event', {
        configurable: true,
        writable: true,
        value: Event
    });

    if (platform.is('Window')) {
        Object.defineProperty(platform.global, 'event', {
            configurable: true,
            get: platform.function(function event() {
                if (this != null) {
                    return this.currentEvent;
                }
            }, {
                before(context, platform) {
                    if (context.this == null) {
                        context.this = platform.global;
                    }
                    if (platform.global !== context.this) {
                        throw new platform.primordials.TypeError('Illegal invocation');
                    }
                    if (platform.hasOwnImplementation(context.this)) {
                        context.this = platform.ownImplementationOf(context.this);
                    } else {
                        context.this = null;
                    }
                },
                after: Platform.wrapOwnReturnValueInterceptor,
                name: 'event'
            }),
            set: platform.function(function event(value) {
                Object.defineProperty(this, 'event', {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value
                });
            }, {
                before: function (context, platform) {
                    if (context.this == null) {
                        context.this = platform.global;
                    }
                    if (context.this !== platform.global) {
                        throw new platform.primordials.TypeError('Illegal invocation');
                    }
                },
                name: 'event'
            })
        });
    }

    platform.definePrimordial('Event', Event);
}
