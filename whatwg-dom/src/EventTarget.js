import { Platform } from '@dragiyski/web-platform';
import {
    validateNativeInvocation,
    validateClassInvocation,
    validateClassImplementation,
    minimumNumberOfMethodArguments,
    minimumNumberOfConstructorArguments,
    validateMethodArgumentTypeAndUnwrap
} from './interceptors.js';
import { performance } from 'perf_hooks';

/**
 * @param {Platform} platform 
 */
export default function (platform) {
    const agent = platform.implementationOf(platform);
    const { DOM } = agent;

    DOM.EventTarget = class EventTarget {
        constructor() {
            this.eventListenerList = [];
        }

        static create(object) {
            if (object == null) {
                object = Object.create(platform.interfaceOf(this.prototype));
            }
            const impl = new this();
            platform.setImplementation(object, impl);
            return impl;
        }

        getTheParent() {
            return null;
        }

        flatten(options) {
            if (options == null) {
                return false;
            }
            if (typeof options === 'boolean') {
                return options;
            }
            return !!options.capture;
        }

        flattenMore(options) {
            const capture = this.flatten(options);
            let once = false;
            let passive = false;
            let signal = null;
            if (options != null) {
                once = !!options.once;
                passive = !!options.passive;
            }
            if ('signal' in options) {
                try {
                    signal = DOM.AbortSignal.convertToSignal(options.signal);
                } catch (e) {
                    if (e instanceof TypeError) {
                        e.message = `Failed to read the 'signal' property from 'AddEventListenerOptions': ${e.message}`;
                    }
                    throw e;
                }
            }
            return Object.assign(Object.create(null), {
                capture,
                once,
                passive,
                signal
            });
        }

        /**
         * @see https://dom.spec.whatwg.org/#add-an-event-listener
         * @param {object} listener 
         */
        addEventListener(listener) {
            if (listener.signal != null && listener.signal.aborted) {
                return;
            }
            if (listener.callback == null) {
                return;
            }
            for (const otherListener of this.eventListenerList) {
                if (otherListener.capture === listener.capture && otherListener.type === listener.type && otherListener.callback === listener.callback) {
                    return;
                }
            }
            this.eventListenerList.push(listener);
            if (listener.signal != null) {
                listener.signal.add(this.removeAnEventListener.bind(this, listener));
            }
        }

        removeEventListener(listener) {
            listener.removed = true;
            let index = this.eventListenerList.indexOf(listener);
            if (index >= 0) {
                this.eventListenerList.splice(index, 1);
            }
        }

        dispatch(...args) {
            return this.constructor.dispatch(this, ...args)
        }

        static dispatch(target, event, legacyFlag = Object.create(null)) {
            event.dispatchFlag = true;
            let targetOverride = legacyFlag.targetOverride ? target.associatedDocument : target;
            let activationTarget = null;
            let relatedTarget = DOM.ShadowRoot.retarget(event.relatedTarget, target);
            let clearTargets = false;
            if (target !== relatedTarget || target === event.relatedTarget) {
                let touchTargets = [];
                for (const touchTarget of event.touchTargetList) {
                    touchTargets.push(DOM.ShadowRoot.retarget(touchTarget, target));
                }
                this.appendToEventPath(event, target, targetOverride, relatedTarget, touchTargets, false);
                let isActivationEvent = Boolean(typeof DOM.MouseEvent === 'function' && event instanceof DOM.MouseEvent && event.type === 'click');
                if (isActivationEvent && typeof target.activationBehavior === 'function') {
                    activationTarget = target;
                }
                let slottable = DOM.Node.slottable(target) && target.isAssigned ? target : null;
                let slotInClosedTree = false;
                let parent = target.getTheParent(event);
                if (parent != null) {
                    if (slottable != null) {
                        // assert(DOM.ShadowRoot.isSlot(parent))
                        slottable = null;
                        if (DOM.ShadowRoot.is(parent.root) && parent.root.mode === 'closed') {
                            slotInClosedTree = true;
                        }
                    }
                    if (DOM.Node.slottable(parent) && parent.isAssigned) {
                        slottable = parent;
                    }
                    relatedTarget = DOM.ShadowRoot.retarget(event.relatedTarget, parent);
                    touchTargets = [];
                    for (const touchTarget of event.touchTargetList) {
                        touchTargets.push(DOM.ShadowRoot.retarget(touchTarget, parent));
                    }
                    const globalImpl = platform.implementationOf(platform.global);
                    if ((parent === globalImpl && platform.is('Window')) || (DOM.Node.is(parent) && target.root.isShadowIncludingInclusiveAncestorOf(parent))) {
                        if (isActivationEvent && event.bubbles && activationTarget == null && typeof parent.activationBehavior === 'function') {
                            activationTarget = parent;
                        }
                        this.appendToEventPath(event, parent, null, relatedTarget, touchTargets, slotInClosedTree);
                    } else if (parent === relatedTarget) {
                        parent = null;
                    } else {
                        target = parent;
                        if (isActivationEvent && activationTarget == null && typeof target.activationBehavior === 'function') {
                            activationTarget = target;
                        }
                        this.appendToEventPath(event, parent, target, relatedTarget, touchTargets, slotInClosedTree);
                    }
                    if (parent != null) {
                        parent = parent.getTheParent(event);
                    }
                    slotInClosedTree = false;
                }
                let clearTargetsStruct;
                for (let i = event.path.length - 1; i >= 0; --i) {
                    const struct = event.path[i];
                    if (struct.shadowAdjustedTarget != null) {
                        clearTargetsStruct = struct;
                        break;
                    }
                }
                for (const maybeShadowNode of [clearTargetsStruct.shadowAdjustedTarget, clearTargetsStruct.relatedTarget, ...clearTargetsStruct.touchTargetList.filter(o => o instanceof DOM.EventTarget)]) {
                    if (DOM.Node.is(maybeShadowNode) && DOM.ShadowRoot.is(maybeShadowNode.root)) {
                        clearTargets = true;
                        break;
                    }
                }
                if (activationTarget != null && typeof activationTarget.legacyPreActivationBehavior === 'function') {
                    activationTarget.legacyPreActivationBehavior();
                }
                for (let i = event.path.length - 1; i >= 0; --i) {
                    const struct = event.path[i];
                    if (struct.shadowAdjustedTarget != null) {
                        event.eventPhase = DOM.Event.phase.AT_TARGET;
                    } else {
                        event.eventPhase = DOM.Event.phase.CAPTURING_PHASE;
                    }
                    this.invoke(struct, event, 'capturing', legacyFlag);
                }
                for (let i = 0; i < event.path.length; ++i) {
                    const struct = event.path[i];
                    if (struct.shadowAdjustedTarget != null) {
                        event.eventPhase = DOM.Event.phase.AT_TARGET;
                    } else {
                        if (!event.bubbles) {
                            continue;
                        }
                        event.eventPhase = DOM.Event.phase.BUBBLING_PHASE;
                    }
                    this.invoke(struct, event, 'bubbling', legacyFlag);
                }
            }
            event.eventPhase = DOM.Event.phase.NONE;
            event.currentTarget = null;
            event.path.length = 0;
            event.dispatchFlag = event.stopPropagationFlag = event.stopImmediatePropagationFlag = false;
            if (clearTargets) {
                event.target = event.relatedTarget = null;
                event.touchTargetList = [];
            }
            if (activationTarget != null) {
                if (!event.canceledFlag) {
                    activationTarget.activationBehavior(event);
                } else if (typeof activationTarget.legacyCanceledActivationBehavior === 'function') {
                    activationTarget.legacyCanceledActivationBehavior();
                }
            }
            return !event.canceledFlag;
        }

        static appendToEventPath(event, invocationTarget, shadowAdjustedTarget, relatedTarget, touchTargets, slotInClosedTree) {
            let invocationTargetInShadowTree = false;
            if (DOM.Node.is(invocationTarget) && DOM.ShadowRoot.is(invocationTarget.root)) {
                invocationTargetInShadowTree = true;
            }
            let rootOfClosedTree = false;
            if (DOM.ShadowRoot.is(invocationTarget) && invocationTarget.mode === 'closed') {
                rootOfClosedTree = true;
            }
            event.path.push({
                invocationTarget,
                invocationTargetInShadowTree,
                shadowAdjustedTarget,
                relatedTarget,
                touchTargetList: touchTargets,
                rootOfClosedTree,
                slotInClosedTree
            });
        }

        static invoke(struct, event, phase, legacyFlag) {
            {
                let currentOrPrecedingStruct;
                for (let i = event.path.indexOf(struct); i >= 0; --i) {
                    const struct = event.path[i];
                    if (struct.shadowAdjustedTarget != null) {
                        currentOrPrecedingStruct = struct;
                        break;
                    }
                }
                event.target = currentOrPrecedingStruct.shadowAdjustedTarget;
            }
            event.relatedTarget = struct.relatedTarget;
            event.touchTargetList = struct.touchTargetList;
            if (event.stopPropagationFlag) {
                return;
            }
            event.currentTarget = struct.invocationTarget;
            const listeners = [...event.currentTarget.eventListenerList.slice];
            let invocationTargetInShadowTree = struct.invocationTargetInShadowTree;
            found = this.innerInvoke(event, listeners, phase, invocationTargetInShadowTree, legacyFlag);
            if (!found && event.isTrusted) {
                const originalEventType = event.type;
                if (originalEventType in DOM.EventTarget.legacyEventMap) {
                    const replacedEventType = DOM.EventTarget.legacyEventMap[originalEventType];
                    event.type = replacedEventType;
                    this.innerInvoke(event, listeners, phase, invocationTargetInShadowTree, legacyFlag);
                    event.type = originalEventType;
                }
            }
        }

        static innerInvoke(event, listeners, phase, invocationTargetInShadowTree, legacyFlag) {
            let found = false;
            for (const listener in listeners) {
                if (listener.removed || event.type !== listener.type) {
                    continue;
                }
                found = true;
                if (phase === 'capturing' && !listener.capture) {
                    continue;
                }
                if (phase === 'bubbling' && listener.capture) {
                    continue;
                }
                if (listener.once) {
                    const listenerIndex = event.currentTarget.eventListenerList.indexOf(listener);
                    if (listenerIndex >= 0) {
                        event.currentTarget.eventListenerList.splice(listenerIndex, 1);
                    }
                }
                let currentEvent;
                if (platform.is('Window')) {
                    const global = platform.ownImplementationOf(platform.global);
                    currentEvent = global.currentEvent;
                    if (!invocationTargetInShadowTree) {
                        global.currentEvent = event;
                    }
                }
                if (listener.passive) {
                    event.inPassiveListenerFlag = true;
                }
                try {
                    this.callUserObjectOperation(listener.callback, 'handleEvent', [event], event.currentTarget);
                } catch (exception) {
                    console.error(exception);
                    legacyFlag.listenerDidThrow = true;
                }
                event.inPassiveListenerFlag = false;
                if (platform.is('Window')) {
                    const global = platform.ownImplementationOf(platform.global);
                    global.currentEvent = currentEvent;
                }
                if (event.stopImmediatePropagationFlag) {
                    return found;
                }
            }
            return found;
        }
    };

    DOM.EventTarget.legacyEventMap = Object.assign(Object.create(null), {
        animationend: 'webkitAnimationEnd',
        animationiteration: 'webkitAnimationIteration',
        animationstart: 'webkitAnimationStart',
        transitionend: 'webkitTransitionEnd'
    });

    function addEventListener(type, callback, options) {
        const listener = (() => {
            try {
                return this.flattenMore(options)
            } catch (e) {
                // If options.signal is present, and it is not an AbortSignal:
                if (e instanceof TypeError) {
                    e.message = `Failed to execute 'addEventListener' on 'EventTarget': ${e.message}`;
                }
                throw e;
            }
        })();
        listener.type = type + '';
        if (callback !== Object(callback)) {
            return;
        }
        listener.callback = callback;
        this.addAnEventListener(listener);
    }

    platform.setImplementation(addEventListener, DOM.EventTarget.prototype.addEventListener);

    function removeEventListener(type, callback, options) {
        type = '' + type;
        const capture = this.flatten(options);
        for (const listener of this.eventListenerList) {
            if (listener.capture === capture && listener.type === type && listener.callback === callback) {
                this.removeAnEventListener(listener);
            }
        }
    }

    platform.setImplementation(removeEventListener, DOM.EventTarget.prototype.removeEventListener);

    function dispatchEvent(event) {
        if (event.dispatchFlag) {
            throw DOM.DOMException.create(`Failed to execute 'dispatchEvent' on 'EventTarget': The event is already being dispatched.`, 'InvalidStateError')
        }
        if (!event.initializedFlag) {
            throw DOM.DOMException.create(`Failed to execute 'dispatchEvent' on 'EventTarget': The event provided is uninitialized.`, 'InvalidStateError')
        }
        event.isTrusted = false;
        this.dispatch(event);
    }

    platform.setImplementation(dispatchEvent, DOM.EventTarget.prototype.dispatch);

    const EventTarget = platform.function(function EventTarget() {
        DOM.EventTarget.create(this);
        return this;
    }, {
        name: 'Event',
        length: 1,
        allowNew: true,
        before: [validateClassInvocation('EventTarget'), validateClassImplementation(DOM.EventTarget)]
    });

    const methodOptions = {
        before: [validateNativeInvocation(EventTarget, DOM.EventTarget), Platform.unwrapThisInterceptor],
        allowNew: false
    };

    EventTarget.prototype = Object.create(platform.primordials['Object.prototype'], {
        constructor: {
            configurable: true,
            writable: true,
            value: EventTarget
        },
        addEventListener: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(addEventListener, {
                ...methodOptions,
                name: 'addEventListener'
            })
        },
        removeEventListener: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(removeEventListener, {
                ...methodOptions,
                name: 'removeEventListener'
            })
        },
        dispatchEvent: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(dispatchEvent, {
                ...methodOptions,
                before: [...methodOptions.before, validateMethodArgumentTypeAndUnwrap('EventTarget', 'dispatchEvent', 0, 'Event', platform.interfaceOf(DOM.Event), DOM.Event)],
                name: 'dispatchEvent'
            })
        }
    });
}