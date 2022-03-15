import { Platform } from '@dragiyski/web-platform';
import { validateNativeInvocation, validateClassInvocation, validateClassImplementation } from './interceptors.js';
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
            this.eventPhase = 0;
            this.stopPropagation = false;
            this.stopImmediatePropagation = false;
            this.canceled = false;
            this.inPassiveListener = false;
            this.initialized = false;
            this.dispatch = false;
            this.target = null;
            this.currentTarget = null;
            this.relatedTarget = null;
            this.touchTargetList = [];
            this.path = [];
        }

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

        static innerEventCreationSteps(object, time = null, dictionary = Object.create(null)) {
            if (time == null) {
                time = performance.timeOrigin + performance.now();
            }
            const Implementation = platform.implementationOf(object).constructor;
            const event = new Implementation();
            platform.setImplementation(object, event);

            event.initialized = true;
            event.timeStamp = time;
            for (const member in dictionary) {
                if (Object.prototype.hasOwnProperty.call(dictionary, member)) {
                    const value = dictionary[member];
                    event[member] = value;
                }
            }
            if (typeof Implementation.eventConstructingSteps === 'function') {
                Implementation.eventConstructingSteps(event, dictionary);
            }
            return event;
        }
    };
    DOM.Event.phase = Object.assign(Object.create(null), {
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3
    });

    const Event = platform.function(function Event(type, eventInitDict = Object.create(null)) {
        if (arguments.length < 1) {
            throw new platform.primordials.TypeError(`Failed to construct 'Event': 1 argument required, but only 0 present.`);
        }
        const internalEventInitDict = Object.assign(Object.create(null), {
            bubbles: false,
            cancelable: false,
            composed: false
        });
        if (eventInitDict === Object(eventInitDict)) {
            for (const name in internalEventInitDict) {
                if (Object.prototype.hasOwnProperty.call(eventInitDict, name)) {
                    internalEventInitDict[name] = Boolean(eventInitDict[name]);
                }
            }
        }
        const self = DOM.Event.innerEventCreationSteps(this, null, internalEventInitDict);
        self.type = type + '';
        return self;
    }, {
        name: 'Event',
        length: 1,
        allowNew: true,
        before: [validateClassInvocation('Event'), validateClassImplementation(DOM.Event)],
        after: [Platform.wrapOwnReturnValueInterceptor]
    });



    platform.setImplementation(Event, DOM.Event);
    platform.setImplementation(Event.prototype, DOM.Event.prototype);

    if (platform.is('Window') || platform.is('Worker') || platform.is('AudioWorklet')) {
        Object.defineProperty(platform.global, 'Event', {
            configurable: true,
            writable: true,
            value: Event
        });
    }

    platform.definePrimordial('Event', Event);
}
