/* eslint-disable camelcase */
import { performance } from 'node:perf_hooks';
import { makeRegularInterceptor, Platform, requireThisImplementationInterceptor, returnValueInterfaceInterceptor, validateThisImplementationInterceptor } from '@dragiyski/node-web-platform';
import { argumentCountError, domNewRequiredError, failedToConstruct } from '@dragiyski/node-web-error-message';

const concept = Platform.realm[Symbol.for('concept')] ??= Object.create(null);
const interface_Event = concept['dom.spec.whatwg.org/#interface-event'] = Symbol('Event');
const concept_eventConstructingSteps = concept['dom.spec.whatwg.org/#concept-event-constructor-ext'] = Symbol('event constructing steps');
const concept_eventCreate = concept['dom.spec.whatwg.org/#concept-event-create'] = Symbol('create an event');
const concept_innerEventCreationSteps = concept['dom.spec.whatwg.org/#inner-event-creation-steps'] = Symbol('inner event creation steps');
const concept_target = concept['dom.spec.whatwg.org/#event-target'] = Symbol('target');
const concept_path = concept['dom.spec.whatwg.org/#event-path'] = Symbol('path');
const flag_initialized = concept['dom.spec.whatwg.org/#initialized-flag'] = Symbol('initialized flag');
const flag_stopPropagation = concept['dom.spec.whatwg.org/#stop-propagation-flag'] = Symbol('stop propagation flag');
const flag_stopImmediatePropagation = concept['dom.spec.whatwg.org/#stop-immediate-propagation-flag'] = Symbol('stop immediate propagation flag');
const flag_canceled = concept['dom.spec.whatwg.org/#canceled-flag'] = Symbol('canceled flag');
const flag_inPassiveListener = concept['dom.spec.whatwg.org/#in-passive-listener-flag'] = Symbol('in passive listener flag');
const flag_composed = concept['dom.spec.whatwg.org/#composed-flag'] = Symbol('composed flag');
const flag_dispatch = concept['dom.spec.whatwg.org/#dispatch-flag'] = Symbol('dispatch flag');
const property_currentTarget = concept['dom.spec.whatwg.org/#dom-event-currenttarget'] = Symbol('currentTarget');
const property_eventPhase = concept['dom.spec.whatwg.org/#dom-event-eventphase'] = Symbol('eventPhase');
const property_bubbles = concept['dom.spec.whatwg.org/#dom-event-bubbles'] = Symbol('bubbles');
const property_cancelable = concept['dom.spec.whatwg.org/#dom-event-cancelable'] = Symbol('cancelable');
const property_timeStamp = concept['dom.spec.whatwg.org/#dom-event-timestamp'] = Symbol('timeStamp');
const property_type = concept['dom.spec.whatwg.org/#dom-event-type'] = Symbol('type');
const property_isTrusted = concept['dom.spec.whatwg.org/#dom-event-istrusted'] = Symbol('isTrusted');

Object.assign(Platform.realm, {
    [interface_Event]:
    /**
     * @param {Platform} platform
     * @param self
     * @param {Array} parameters
     * @param {Function} target
     */
    function Event(platform, self, parameters, target) {
        if (target == null) {
            throw new TypeError(domNewRequiredError('Event'));
        }
        if (parameters.length < 1) {
            throw new TypeError(failedToConstruct('Event', argumentCountError(1, parameters.length)));
        }
        target = platform.implementationOf(target);
        if (target == null) {
            throw new TypeError('Illegal constructor');
        }
        const type = '' + parameters[0];
        const event = Platform.realm[concept_innerEventCreationSteps](target, platform, performance.now(), parameters[1] ?? {});
        event[property_type] = type;
        return event;
    },
    /**
     *
     * @param {Event} Interface
     * @param {Platform} platform
     * @param {Number} time
     * @param {object} dictionary
     */
    [concept_innerEventCreationSteps](Interface, platform, time, dictionary) {
        const event = Interface.create(platform);
        event[flag_initialized] = true;
        event[property_timeStamp] = time;
        dictionary = dictionary instanceof Interface.EventInit ? dictionary : new Interface.EventInit(dictionary);
        for (const [member, value] of dictionary) {
            event[member] = value;
        }
        if (typeof Interface[concept_eventConstructingSteps] === 'function') {
            Interface[concept_eventConstructingSteps](event, dictionary);
        }
        return event;
    },
    [concept_eventCreate](Interface, platform = null) {
        if (platform == null) {
            if ((platform = Platform.current()) == null) {
                const error = new ReferenceError(`Execution context is not in a platform`);
                error.code = 'WEB_EXECUTION_NO_PLATFORM';
                throw error;
            }
        }
        const event = this[concept_innerEventCreationSteps](Interface, platform, performance.now(), new Interface.EventInit());
        event[property_isTrusted] = true;
        return event;
    }
});

Platform.realm.Event = class Event {
    [concept_target] = null;
    [concept_path] = [];
    [flag_stopPropagation] = false;
    [flag_stopImmediatePropagation] = false;
    [flag_canceled] = false;
    [flag_inPassiveListener] = false;
    [flag_composed] = false;
    [flag_initialized] = false;
    [flag_dispatch] = false;
    [property_currentTarget] = null;
    [property_type] = '';
    [property_isTrusted] = false;
    [property_timeStamp] = 0;
    [property_eventPhase] = 0;

    static phase = Object.assign(Object.create(null), {
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3
    });

    static {
        this.EventInit = class EventInit {
            static #members = Object.assign(Object.create(null), {
                bubbles: property_bubbles,
                cancelable: property_cancelable,
                composed: flag_composed
            });

            constructor(dictionary) {
                dictionary ??= {};
                this.bubbles = Boolean(dictionary.bubbles);
                this.cancelable = Boolean(dictionary.cancelable);
                this.composed = Boolean(dictionary.composed);
            }

            * [Symbol.iterator]() {
                for (const name in EventInit.#members) {
                    yield [EventInit.#members[name], this[name]];
                }
            }
        };
    }

    static create(platform) {
        const impl = new this();
        const iface = Object.create(platform.interfaceOf(this.prototype));
        platform.setImplementation(iface, impl);
        // "isTrusted" property is defined as "[LegacyUnforgeable]",
        // i.e. added as non-configurable *own* property to the event object.
        Object.defineProperty(iface, 'isTrusted', {
            enumerable: true,
            get: platform.realm[property_isTrusted]
        });
        return impl;
    }

    get type() {
        return this[property_type];
    }

    get target() {
        return this[concept_target];
    }

    get currentTarget() {
        return this[property_currentTarget];
    }

    composedPath() {
        const composedPath = [];
        const path = this[concept_path];
        if (path.length <= 0) {
            return composedPath;
        }
        const currentTarget = this[property_currentTarget];
        composedPath.push(currentTarget);
        let currentTargetIndex = 0;
        let currentTargetHiddenSubtreeLevel = 0;
        let index = path.length - 1;
        while (index >= 0) {
            const struct = path[index];
            if (struct.rootOfClosedTree) {
                ++currentTargetHiddenSubtreeLevel;
            }
            if (struct.invocationTarget === currentTarget) {
                currentTargetIndex = index;
                break;
            }
            if (struct.slotInClosedTree) {
                --currentTargetHiddenSubtreeLevel;
            }
            --index;
        }
        let currentHiddenLevel = currentTargetHiddenSubtreeLevel;
        let maxHiddenLevel = currentTargetHiddenSubtreeLevel;
        index = currentTargetIndex - 1;
        while (index >= 0) {
            const struct = path[index];
            if (struct.rootOfClosedTree) {
                ++currentHiddenLevel;
            }
            if (currentHiddenLevel <= maxHiddenLevel) {
                composedPath.unshift(struct.invocationTarget);
            }
            if (struct.slotInClosedTree) {
                --currentHiddenLevel;
                if (currentHiddenLevel < maxHiddenLevel) {
                    maxHiddenLevel = currentHiddenLevel;
                }
            }
            --index;
        }
        currentHiddenLevel = maxHiddenLevel = currentTargetHiddenSubtreeLevel;
        index = currentTargetIndex + 1;
        while (index < path.length) {
            const struct = path[index];
            if (struct.slotInClosedTree) {
                ++currentHiddenLevel;
            }
            if (currentHiddenLevel <= maxHiddenLevel) {
                composedPath.push(struct.invocationTarget);
            }
            if (struct.rootOfClosedTree) {
                --currentHiddenLevel;
                if (currentHiddenLevel < maxHiddenLevel) {
                    maxHiddenLevel = currentHiddenLevel;
                }
            }
            ++index;
        }
        return composedPath;
    }

    get eventPhase() {
        return this[property_eventPhase];
    }

    stopPropagation() {
        this[flag_stopPropagation] = true;
    }

    get cancelBubble() {
        return this[flag_stopPropagation];
    }

    set cancelBubble(value) {
        if (value) {
            this[flag_stopPropagation] = true;
        }
    }

    stopImmediatePropagation() {
        this[flag_stopPropagation] = true;
        this[flag_stopImmediatePropagation] = true;
    }

    get bubbles() {
        return this[property_bubbles];
    }

    get cancelable() {
        return this[property_cancelable];
    }

    setTheCanceledFlag() {
        if (this[property_cancelable] && !this[flag_inPassiveListener]) {
            this[flag_canceled] = true;
        }
    }

    get returnValue() {
        return !this[flag_canceled];
    }

    set returnValue(value) {
        if (!value) {
            this.setTheCanceledFlag();
        }
    }

    preventDefault() {
        this.setTheCanceledFlag();
    }

    get defaultPrevented() {
        return this[flag_canceled];
    }

    get composed() {
        return this[flag_composed];
    }

    get isTrusted() {
        return this[property_isTrusted];
    }

    get timeStamp() {
        return this[property_timeStamp];
    }
};

Platform.initialize(
    'dom.spec.whatwg.org',
    'interface-event',
    /**
     * @param {Platform} platform
     */
    platform => {
        platform.realm.Event = platform.function(returnValueInterfaceInterceptor(Platform.realm[interface_Event]), { name: 'Event' });
        platform.setImplementation(platform.realm.Event, Platform.realm.Event);
        platform.setImplementation(platform.realm.Event.prototype, Platform.realm.Event.prototype);
        Object.defineProperty(platform.realm.Event.prototype, platform.primordials['Symbol.toStringTag'], {
            configurable: true,
            value: 'Event'
        });
        {
            const Target = platform.realm.Event;
            const Source = Platform.realm.Event;
            // primitive read-only attributes
            for (const name of ['type', 'eventPhase', 'bubbles', 'cancelable', 'defaultPrevented', 'composed', 'timeStamp']) {
                const descriptor = Object.getOwnPropertyDescriptor(Source.prototype, name);
                Object.defineProperty(Target.prototype, name, {
                    configurable: true,
                    enumerable: true,
                    get: platform.function(
                        validateThisImplementationInterceptor(makeRegularInterceptor(descriptor.get), Source),
                        { name }
                    )
                });
            }
            // interface read-only attributes
            for (const name of ['target', 'currentTarget']) {
                const descriptor = Object.getOwnPropertyDescriptor(Source.prototype, name);
                Object.defineProperty(Target.prototype, name, {
                    configurable: true,
                    enumerable: true,
                    get: platform.function(
                        validateThisImplementationInterceptor(
                            returnValueInterfaceInterceptor(makeRegularInterceptor(descriptor.get)),
                            Source
                        ),
                        { name }
                    )
                });
            }
            {
                const descriptor = Object.getOwnPropertyDescriptor(Source.prototype, 'target');
                Object.defineProperty(Target.prototype, 'srcElement', {
                    configurable: true,
                    enumerable: true,
                    get: platform.function(
                        validateThisImplementationInterceptor(
                            returnValueInterfaceInterceptor(makeRegularInterceptor(descriptor.get)),
                            Source
                        ),
                        { name: 'srcElement' }
                    )
                });
            }
            // primitive read-write attributes
            for (const name of ['returnValue', 'cancelBubble']) {
                const descriptor = Object.getOwnPropertyDescriptor(Source.prototype, name);
                Object.defineProperty(Target.prototype, name, {
                    configurable: true,
                    enumerable: true,
                    get: platform.function(
                        validateThisImplementationInterceptor(makeRegularInterceptor(descriptor.get), Source),
                        { name }
                    ),
                    set: platform.function(
                        validateThisImplementationInterceptor(makeRegularInterceptor(descriptor.set), Source),
                        { name }
                    )
                });
                // primitive methods
                for (const name of ['stopPropagation', 'stopImmediatePropagation', 'preventDefault']) {
                    const descriptor = Object.getOwnPropertyDescriptor(Source.prototype, name);
                    Object.defineProperty(Target.prototype, name, {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: platform.function(
                            validateThisImplementationInterceptor(makeRegularInterceptor(descriptor.value), Source),
                            { name }
                        )
                    });
                }
                {
                    const composedPath = Object.getOwnPropertyDescriptor(Source.prototype, 'composedPath').value;
                    Object.defineProperty(Target.prototype, 'composedPath', {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: platform.function(
                            validateThisImplementationInterceptor(
                                makeComposedPathInterfaceInterceptor(
                                    makeRegularInterceptor(composedPath)
                                ),
                                Source
                            ),
                            { name: 'composedPath' }
                        )
                    });
                }
            }
        }
        platform.realm[property_isTrusted] = platform.function(
            requireThisImplementationInterceptor(
                makeRegularInterceptor(
                    Object.getOwnPropertyDescriptor(Platform.realm.Event.prototype, 'isTrusted').get
                )
            ),
            { name: 'isTrusted' }
        );
    }
);

function makeComposedPathInterfaceInterceptor(callee) {
    return function (platform, ...rest) {
        const value = callee(platform, ...rest);
        const wrapped = new platform.primordials.Array();
        Reflect.apply(platform.primordials['Array.prototype.push'], wrapped, value.map(impl => platform.interfaceOf(impl) ?? impl));
        return wrapped;
    };
}

/**
 * @typedef {object} Event
 */
