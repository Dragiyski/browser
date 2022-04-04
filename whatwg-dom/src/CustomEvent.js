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

    DOM.CustomEvent = class CustomEvent extends DOM.Event {
        constructor() {
            super();
            this.detail = null;
        }
    };

    DOM.CustomEvent.defaultEventInit = Object.assign(Object.create(DOM.Event.defaultEventInit), {
        detail: null
    });
    DOM.CustomEvent.processEventInitProperty = Object.assign(Object.create(DOM.Event.processEventInitProperty), {
        detail: value => value
    });

    const CustomEvent = platform.function(function CustomEvent(type, eventInitDict = Object.create(null)) {
        DOM.CustomEvent.create(this, type, eventInitDict);
        return this;
    }, {
        name: 'CustomEvent',
        length: 1,
        allowNew: true,
        before: [validateClassInvocation('CustomEvent'), validateClassImplementation(DOM.CustomEvent), minimumNumberOfConstructorArguments(1, 'CustomEvent')],
        after: [Platform.wrapOwnReturnValueInterceptor]
    });

    const methodOptions = {
        before: [validateNativeInvocation(CustomEvent, DOM.CustomEvent), Platform.unwrapThisInterceptor],
        allowNew: false
    };

    CustomEvent.prototype = Object.create(platform.interfaceOf(DOM.Event.prototype), {
        constructor: {
            configurable: true,
            writable: true,
            value: CustomEvent
        },
        detail: {
            configurable: true,
            enumerable: true,
            get: platform.function(function detail() {
                return this.detail;
            }, {
                ...methodOptions,
                name: 'detail'
            })
        },
        initCustomEvent: {
            configurable: true,
            enumerable: true,
            writable: true,
            value: platform.function(function initCustomEvent(type, bubbles = false, cancelable = false, detail = null) {
                if (this.dispatchFlag) {
                    return;
                }
                this.initialize(type, bubbles, cancelable);
                this.detail = detail;
            }, {
                ...methodOptions,
                before: [...methodOptions.before, minimumNumberOfMethodArguments(1, 'initCustomEvent', 'CustomEvent')],
                name: 'initCustomEvent'
            })
        }
    });

    platform.setImplementation(CustomEvent, DOM.CustomEvent);
    platform.setImplementation(CustomEvent.prototype, DOM.CustomEvent.prototype);

    Object.defineProperty(platform.global, 'CustomEvent', {
        configurable: true,
        writable: true,
        value: CustomEvent
    });

    platform.definePrimordial('CustomEvent', CustomEvent);
}
