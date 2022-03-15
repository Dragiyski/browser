import { Platform } from '@dragiyski/web-platform';
import { validateNativeInvocation, validateClassInvocation, validateClassImplementation } from './interceptors.js';
/**
 * @param {Platform} platform
 */
export default function (platform) {
    const agent = platform.implementationOf(platform);
    const { DOM } = agent;
    DOM.DOMException = class DOMException extends Error {
        constructor(message = '', name = 'Error', code = true) {
            super();
            this.message = message;
            this.name = name;
            if (typeof code === 'number') {
                this.code = code;
            } else if (code === true && Object.hasOwnProperty.call(this.nameToCode, name) && typeof this.nameToCode[name] === 'number') {
                this.code = this.nameToCode[name];
            } else {
                this.code = 0;
            }
        }

        static create(message = '', name = 'Error', code = true) {
            const domObject = Object.create(platform.interfaceOf(this.prototype));
            return this.initialize(domObject, message, name, code);
        }

        static initialize(domObject, message = '', name = 'Error', code = 0) {
            const implementation = new DOMException(message, name, code);
            platform.setImplementation(domObject, implementation);
            return implementation;
        }
    }
    Object.defineProperties(DOM.DOMException.prototype, {
        nameToCode: {
            configurable: true,
            writable: true,
            value: {
                INDEX_SIZE_ERR: 1,
                DOMSTRING_SIZE_ERR: 2,
                HIERARCHY_REQUEST_ERR: 3,
                WRONG_DOCUMENT_ERR: 4,
                INVALID_CHARACTER_ERR: 5,
                NO_DATA_ALLOWED_ERR: 6,
                NO_MODIFICATION_ALLOWED_ERR: 7,
                NOT_FOUND_ERR: 8,
                NOT_SUPPORTED_ERR: 9,
                INUSE_ATTRIBUTE_ERR: 10,
                INVALID_STATE_ERR: 11,
                SYNTAX_ERR: 12,
                INVALID_MODIFICATION_ERR: 13,
                NAMESPACE_ERR: 14,
                INVALID_ACCESS_ERR: 15,
                VALIDATION_ERR: 16,
                TYPE_MISMATCH_ERR: 17,
                SECURITY_ERR: 18,
                NETWORK_ERR: 19,
                ABORT_ERR: 20,
                URL_MISMATCH_ERR: 21,
                QUOTA_EXCEEDED_ERR: 22,
                TIMEOUT_ERR: 23,
                INVALID_NODE_TYPE_ERR: 24,
                DATA_CLONE_ERR: 25
            }
        }
    });

    Object.defineProperties(DOM.DOMException, {
        nameToCode: {
            configurable: true,
            writable: true,
            value: DOM.DOMException.prototype.nameToCode
        }
    });

    /**
     * Used to generate an object that is considered a native error. This is internal to V8.
     * 
     * 
     */
    const DOMExceptionError = class DOMException extends platform.primordials.Error {
    };

    const DOMException = platform.function(function DOMException(message = '', name = 'Error') {
        message = '' + message;
        name = '' + name;
        DOM.DOMException.initialize(this, message, name);
        // While the interface function is called with `new`, the implementation function is called as function, so a return value must be present for `after` interceptors to work.
        return this;
    }, {
        name: 'DOMException',
        before: [
            validateClassInvocation('DOMException'),
            validateClassImplementation(DOM.DOMException),
            function (context, platform) {
                const target = context.newTarget;
                // To ensure proper subclassing, while ensuring object is "native error" (marked with JSError tag),
                // we craete the object from a class definition from Error.
                // And then set its prototype by the new.target prototype (not necessarily DOMException.prototype).
                const targetPrototype = target.prototype;
                const self = new DOMExceptionError();
                if (typeof target.name === 'string') {
                    self.name = target.name;
                }
                Object.setPrototypeOf(self, targetPrototype);
                context.this = self;
            }
        ],
        after: [function (value, context, platform) {
            platform.captureStackTrace(value, context.newTarget);
            delete value.name;
            return value;
        }],
        allowNew: true
    });

    Object.setPrototypeOf(DOMException, Error);

    const methodOptions = {
        before: [validateNativeInvocation(DOMException, DOM.DOMException), Platform.unwrapThisInterceptor],
        finally: [],
        allowNew: false
    };

    DOMException.prototype = Object.create(platform.primordials['Error.prototype'], {
        constructor: {
            configurable: true,
            writable: true,
            value: DOMException
        },
        message: {
            configurable: true,
            enumerable: true,
            get: platform.function(function () {
                return this.message;
            }, {
                ...methodOptions,
                name: 'message'
            })
        },
        name: {
            configurable: true,
            enumerable: true,
            get: platform.function(function () {
                return this.name;
            }, {
                ...methodOptions,
                name: 'name'
            })
        },
        code: {
            configurable: true,
            enumerable: true,
            get: platform.function(function () {
                return this.code;
            }, {
                ...methodOptions,
                name: 'code'
            })
        },
        [platform.primordials['Symbol.toStringTag']]: {
            configurable: false,
            enumerable: false,
            writable: true,
            value: 'DOMException'
        }
    });

    platform.setImplementation(DOMException, DOM.DOMException);
    platform.setImplementation(DOMException.prototype, DOM.DOMException.prototype);

    if (platform.is('Window') || platform.is('Worker')) {
        Object.defineProperty(platform.global, 'DOMException', {
            configurable: true,
            writable: true,
            value: DOMException
        });
    }

    platform.definePrimordial('DOMException', DOMException);
}