import { Platform } from '@dragiyski/web-platform';
import { validateNativeInvocation, validateClassInvocation, validateClassImplementation } from './interceptors.js';

export default class DOMException extends Error {
    constructor(message = '', name = 'Error', code = true) {
        super();
        this.message = message;
        this.name = name;
        if (typeof code === 'number') {
            this.code = code;
        } else if (code === true) {
            if (name in this.nameToCode) {
                this.code = this.nameToCode[name];
            } else {
                this.code = 0;
            }
        } else {
            this.code = 0;
        }
    }

    static create(message = '', name = 'Error', code = true) {
        const platform = Platform.getCurrentPlatform();
        const self = Reflect.construct(platform.primordials.Error, message, platform.primordials.Error);
        Object.setPrototypeOf(self, platform.interfaceOf(this.prototype));
        return this.initialize(self, message, name, code);
    }

    static initialize(domObject, message = '', name = 'Error', code = 0) {
        const platform = Platform.getCurrentPlatform();
        const implementation = new DOM.DOMException(message, name, code);
        platform.setImplementation(domObject, implementation);
        return implementation;
    }
}

Object.defineProperties(DOM.DOMException, {
    constToCode: {
        configurable: true,
        writable: true,
        value: Object.assign(Object.create(null), {
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
        })
    },
    nameToCode: {
        configurable: true,
        writable: true,
        value: Object.assign(Object.create(null), {
            IndexSizeError: 1,
            HierarchyRequestError: 3,
            WrongDocumentError: 4,
            InvalidCharacterError: 5,
            NoModificationAllowedError: 7,
            NotFoundError: 8,
            NotSupportedError: 9,
            InUseAttributeError: 10,
            InvalidStateError: 11,
            SyntaxError: 12,
            InvalidModificationError: 13,
            NamespaceError: 14,
            InvalidAccessError: 15,
            TypeMismatchError: 17,
            SecurityError: 18,
            NetworkError: 19,
            AbortError: 20,
            URLMismatchError: 21,
            QuotaExceededError: 22,
            TimeoutError: 23,
            InvalidNodeTypeError: 24,
            DataCloneError: 25
        })
    }
});

export function install(platform) {
    if (platform == null) {
        platform = Platform.getCurrentPlatform();
    }
    const agent = platform.implementationOf(platform);
    const { DOM } = agent;

    DOM.DOMException = DOMException;

    const DOMException = platform.function(function (message = '', name = 'Error') {
        message = '' + message;
        name = '' + name;
        DOM.DOMException.initialize(this, message, name);
        return this;
    }, {
        name: 'DOMException',
        before: [
            validateClassInvocation('DOMException'),
            validateClassImplementation(DOM.DOMException),
            function (context, platform) {
                const target = context.target;
                // To ensure proper subclassing, while ensuring object is "native error" (marked with JSError tag),
                // we craete the object from a class definition from Error.
                // And then set its prototype by the new.target prototype (not necessarily DOMException.prototype).
                const targetPrototype = target.prototype;
                const self = Reflect.construct(platform.primordials.Error, context.arguments, platform.primordials.Error);
                const name = platform.getFunctionName(context.target);
                if (typeof name !== 'string') {
                    name = 'DOMException'
                }
                self.name = name;
                Object.setPrototypeOf(self, targetPrototype);
                context.this = self;
            }
        ],
        after: [function collectStackTraceInterceptor(value, context, platform) {
            platform.captureStackTrace(value, context.target);
            delete value.name;
            return value;
        }],
        allowNew: true
    });

    Object.setPrototypeOf(DOMException, platform.primordials.Error);
    
    const methodOptions = {
        before: [validateNativeInvocation(DOMException, DOM.DOMException), Platform.unwrapThisInterceptor],
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

    for (const constName in DOM.DOMException.constToCode) {
        const value = DOM.DOMException.constToCode[constName];
        for (const target of [DOMException, DOMException.prototype]) {
            Object.defineProperty(target, constName, {
                enumerable: true,
                value
            });
        }
    }

    platform.setImplementation(DOMException, DOM.DOMException);
    platform.setImplementation(DOMException.prototype, DOM.DOMException.prototype);

    // TODO: Implement [Serializable] DOMException

    if (platform.is('Window') || platform.is('Worker')) {
        Object.defineProperty(platform.global, 'DOMException', {
            configurable: true,
            writable: true,
            value: DOMException
        });
    }

    platform.definePrimordial('DOMException', DOMException);
}

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
            } else if (code === true) {
                if (name in this.nameToCode) {
                    this.code = this.nameToCode[name];
                } else {
                    this.code = 0;
                }
            } else {
                this.code = 0;
            }
        }

        static create(message = '', name = 'Error', code = true) {
            const self = Reflect.construct(platform.primordials.Error, message, platform.primordials.Error);
            Object.setPrototypeOf(self, platform.interfaceOf(this.prototype));
            return this.initialize(self, message, name, code);
        }

        static initialize(domObject, message = '', name = 'Error', code = 0) {
            const implementation = new DOM.DOMException(message, name, code);
            platform.setImplementation(domObject, implementation);
            return implementation;
        }
    }
    Object.defineProperties(DOM.DOMException.prototype, {
        constToCode: {
            configurable: true,
            writable: true,
            value: Object.assign(Object.create(null), {
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
            })
        },
        nameToCode: {
            configurable: true,
            writable: true,
            value: Object.assign(Object.create(null), {
                IndexSizeError: 1,
                HierarchyRequestError: 3,
                WrongDocumentError: 4,
                InvalidCharacterError: 5,
                NoModificationAllowedError: 7,
                NotFoundError: 8,
                NotSupportedError: 9,
                InUseAttributeError: 10,
                InvalidStateError: 11,
                SyntaxError: 12,
                InvalidModificationError: 13,
                NamespaceError: 14,
                InvalidAccessError: 15,
                TypeMismatchError: 17,
                SecurityError: 18,
                NetworkError: 19,
                AbortError: 20,
                URLMismatchError: 21,
                QuotaExceededError: 22,
                TimeoutError: 23,
                InvalidNodeTypeError: 24,
                DataCloneError: 25
            })
        }
    });

    Object.defineProperties(DOM.DOMException, {
        constToCode: {
            configurable: true,
            writable: true,
            value: DOM.DOMException.prototype.constToCode
        },
        nameToCode: {
            configurable: true,
            writable: true,
            value: DOM.DOMException.prototype.nameToCode
        }
    });

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
                const target = context.target;
                // To ensure proper subclassing, while ensuring object is "native error" (marked with JSError tag),
                // we craete the object from a class definition from Error.
                // And then set its prototype by the new.target prototype (not necessarily DOMException.prototype).
                const targetPrototype = target.prototype;
                const self = Reflect.construct(platform.primordials.Error, context.arguments, platform.primordials.Error);
                const name = platform.getFunctionName(context.target);
                if (typeof name !== 'string') {
                    name = 'DOMException'
                }
                self.name = name;
                Object.setPrototypeOf(self, targetPrototype);
                context.this = self;
            }
        ],
        after: [function (value, context, platform) {
            platform.captureStackTrace(value, context.target);
            delete value.name;
            return value;
        }],
        allowNew: true
    });

    Object.setPrototypeOf(DOMException, Error);

    const methodOptions = {
        before: [validateNativeInvocation(DOMException, DOM.DOMException), Platform.unwrapThisInterceptor],
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

    for (const constName in DOM.DOMException.constToCode) {
        const value = DOM.DOMException.constToCode[constName];
        for (const target of [DOMException, DOMException.prototype]) {
            Object.defineProperty(target, constName, {
                enumerable: true,
                value
            });
        }
    }

    platform.setImplementation(DOMException, DOM.DOMException);
    platform.setImplementation(DOMException.prototype, DOM.DOMException.prototype);

    // TODO: Implement [Serializable] DOMException

    if (platform.is('Window') || platform.is('Worker')) {
        Object.defineProperty(platform.global, 'DOMException', {
            configurable: true,
            writable: true,
            value: DOMException
        });
    }

    platform.definePrimordial('DOMException', DOMException);
}