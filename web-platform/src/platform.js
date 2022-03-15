import vm from 'vm';
import { copyPrimordials, definePrimordial } from './primordials.js';
import native from './native.cjs';

export const symbols = {
    interface: Symbol('interface'),
    implementation: Symbol('implementation'),
    sandbox: Symbol('sandbox'),
    type: Symbol('type'),
    securityStack: Symbol('securityStack'),
    lockToken: Symbol('lockToken'),
    unlockToken: Symbol('unlockToken'),
    nativeExecutor: Symbol('nativeExecutor'),
    exceptionMap: Symbol('exceptionMap'),
    stackCapture: Symbol('stackCapture')
};

export class Platform {
    constructor(options) {
        options = { ...options };
        this[symbols.interface] = Symbol('interface');
        this[symbols.implementation] = new WeakMap();
        this[symbols.type] = [];
        this[symbols.securityStack] = [];
        this[symbols.lockToken] = Object.create(null);
        this[symbols.exceptionMap] = new WeakMap();
        if (Object.prototype.hasOwnProperty.call(options, 'type')) {
            const type = options.type;
            if (typeof type === 'string') {
                this[symbols.type].push(type);
            } else if (type === Object(type) && typeof type[Symbol.iterator] === 'function') {
                for (const tp of type) {
                    if (typeof tp === 'string') {
                        this[symbols.type].push(tp);
                    }
                }
            }
        }
        if (this[symbols.type].length <= 0) {
            this[symbols.type].push('Window');
        }
        if (options.globalName != null) {
            if (typeof options.globalName !== 'string') {
                throw new TypeError('`options.globalName` is not a string');
            }
        } else {
            options.globalName = this[symbols.type][0];
        }
        {
            const vm_options = {
                codeGeneration: {
                    strings: true,
                    wasm: true
                }
            };
            if (typeof options.name === 'string') {
                vm_options.name = options.name;
            }
            if (typeof options.origin === 'string') {
                vm_options.origin = options.origin;
            }
            const SandBoxClass = native.nativeFunction(this, globalConstructorGuard, options.globalName, true, 0);
            Object.setPrototypeOf(SandBoxClass.prototype, null);
            this[symbols.sandbox] = Object.create(SandBoxClass.prototype);
            vm.createContext(this[symbols.sandbox], vm_options);
        }
        Object.defineProperties(this, {
            global: {
                value: vm.runInContext('globalThis', this[symbols.sandbox])
            },
            primordials: {
                value: Object.create(null)
            }
        })
        copyPrimordials(this.primordials, this.global);
        this[symbols.unlockToken] = native.getSecurityToken(this.global);
        this.setImplementation(this, Object.create(null));
        this[symbols.nativeExecutor] = this.executeUnlockedPlatformNativeFunction;

        this[symbols.stackCapture] = this.compileFunction(`platform.enterLock();
try {
    platform.call(platform.primordials['Error.captureStackTrace'], platform.primordials.Error, object, constructor);
    return object;
} finally {
    platform.leaveLock();
}`, ['platform', 'object', 'constructor']);

        for (const name of ['Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError']) {
            const localClass = global[name];
            const platformClass = this.global[name];
            this.setImplementation(platformClass, localClass);
            this.setImplementation(platformClass.prototype, localClass.prototype);
        }
        for (const name of ['Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError']) {
            this[symbols.exceptionMap].set(global[name].prototype, translateErrorToPlatform(name));
        }
        this[symbols.exceptionMap].set(AggregateError.prototype, translateAggregateErrorToPlatform);
        const immediateStackTrace = this.function(function captureStackTrace(object) {
            object.stack;
        }, {
            name: 'captureStackTrace',
            allowNew: false,
            length: 2,
            before(context, platform) {
                platform.captureStackTrace.apply(platform, context.arguments);
            }
        });
        Object.defineProperty(this.global.Error, 'captureStackTrace', {
            configurable: true,
            writable: true,
            value: immediateStackTrace
        });
    }

    is(type) {
        return this[symbols.type].indexOf(type) >= 0;
    }

    /**
     * This provides a way to generate a function in context of the platform.
     * 
     * @param {function} implementation The function to execute when the native function has been called.
     * @param {object} options 
     * @param {function|Iterable<function>} [options.before] Called before the execution of the function. It can modify `this`, the arguments or the `new.target`
     * @param {function|Iterable<function>} [options.after] Called after the execution of the function, if no exception is thrown. It can modify the return result.
     * @param {function|Iterable<function>} [options.catch] Called if the implementation threw an exception. It can modify or replace the exception before rethrow. It cannot absorb the exception and return normally.
     * @param {function|Iterable<function>} [options.finally] Called at the end of the execution. It cannot modify anything, but it is useful for resource handling.
     * @param {string} [options.name] Give the function a name.
     * @param {boolean} [options.allowNew] Is it possible to use this function as a constructor. Defaults to `true`. If set to `false`, calling the function with `new` will throw `TypeError` in the function context.
     * @param {object} [options.context] Additional properties for the callback functions.
     */
    function(implementation, options) {
        if (typeof implementation !== 'function') {
            throw new TypeError('Argument `implementation` not a function');
        }
        options = { ...options };

        const factoryArgs = [implementation];
        if (options.context === Object(options.context)) {
            factoryArgs.push(options.context);
        } else if (options.context != null) {
            throw new TypeError('`options.context` must be an object, if present');
        } else {
            factoryArgs.push(null);
        }
        let flags = 0;
        for (const interceptor of interceptorNames) {
            const callbacks = [];
            if (typeof options[interceptor] === 'function') {
                callbacks.push(options[interceptor]);
            } else if (options[interceptor] === Object(options[interceptor]) && typeof options[interceptor][Symbol.iterator] === 'function') {
                for (const callback of options[interceptor]) {
                    if (typeof callback !== 'function') {
                        throw new TypeError(`\`options.${interceptor}[${callbacks.length}]\` is not a function`);
                    }
                    callbacks.push(callback);
                }
            } else if (options[interceptor] != null) {
                throw new TypeError(`\`options.${interceptor}\` is not a function`);
            }
            if (callbacks.length > 1) {
                if (interceptor === 'after' || interceptor === 'catch') {
                    factoryArgs.push(arrayInterceptorsWithReturn(callbacks));
                } else {
                    factoryArgs.push(arrayInterceptorsWithoutReturn(callbacks));
                }
                flags |= interceptorFlag[interceptor];
            } else if (callbacks.length > 0) {
                factoryArgs.push(callbacks[0]);
                flags |= interceptorFlag[interceptor];
            }
        }
        const wrapper = createNativeFunctionWrapper(getFactory(flags)(...factoryArgs));
        const nativeArgs = [this, wrapper];
        if (options.name != null) {
            if (typeof options.name !== 'string') {
                throw new TypeError('`options.name` is not a string');
            }
            if (options.name.length <= 0) {
                throw new TypeError('`options.name` is an empty string');
            }
            nativeArgs.push(options.name);
        } else {
            nativeArgs.push(null);
        }
        if (options.allowNew != null) {
            if (typeof options.allowNew !== 'boolean') {
                throw new TypeError('`options.name` is not a boolean');
            }
            nativeArgs.push(options.allowNew);
        } else {
            nativeArgs.push(true);
        }
        if (options.length != null) {
            if (!Number.isSafeInteger(options.length) || options.length < 0 || options.length > 0x7FFFFFFF) {
                throw new TypeError('`options.length` is invalid: expected an integer between 0 and 2^31-1');
            }
            nativeArgs.push(options.length);
        } else {
            nativeArgs.push(0);
        }
        return native.nativeFunction(...nativeArgs);
    }

    compileFunction(code, params = [], options = {}) {
        return vm.compileFunction(code, params, {
            ...options,
            parsingContext: this[symbols.sandbox]
        });
    }

    runUserScript(code, options) {
        options = { ...options };
        if (typeof code !== 'string') {
            throw new TypeError('`code` must be a string');
        }
        if (options.onUncaughtException == null) {
            options.onUncaughtException = console.error.bind(console);
        }
        if (typeof options.onUncaughtException !== 'function') {
            throw new TypeError('`options.onUncaughtException` is not a function');
        }
        const onUncaughtException = options.onUncaughtException;
        try {
            this.enterLock();
            try {
                vm.runInContext(code, this[symbols.sandbox], options);
            } finally {
                this.leaveLock();
            }
        } catch (e) {
            onUncaughtException(e);
        }
    }

    lazyProperty(receiver, name, getter, descriptor = { configurable: true, enumerable: true, writable: true }) {
        descriptor = { ...descriptor };
        if (receiver !== Object(receiver)) {
            throw new TypeError('`receiver` is not an object');
        }
        if (typeof name !== 'string' && typeof name !== 'symbol') {
            throw new TypeError('`name` is not valid name');
        }
        if (typeof getter !== 'function') {
            throw new TypeError('`getter` is not a function');
        }
        options = {
            receiver,
            name,
            getter,
            platform: this,
        };
        for (const attr of ['configurable', 'enumerable', 'writable']) {
            options[attr] = Boolean(descriptor[attr]);
        }
    }

    captureStackTrace(object, constructor) {
        if (constructor == null) {
            constructor = this[symbols.stackCapture];
        }
        const capture = this[symbols.stackCapture];
        capture(this, object, constructor);
        // `Error.captureStackTrace` save the current stack filtering frames not accessible in the `v8::Context`.
        // However, the captured trace is not converted to string, it is just saved and **lazy data property** is installed on `object`.
        // The first time this is retrieved, the lazy property accessor will call `prepareStackTrace`. NodeJS have custom `prepareStackTrace`,
        // installed on the isolate, too difficult to replace. If this is retrieved for the first time in the locked environment,
        // the custom NodeJS `prepareStackTrace` will throw `TypeErrror('no access')` while converting the stack frames to string.

        // To avoid that, we retrieve this here, in an unlocked environment, converting the stack to normal data property.
        // This is slower, as it requires exception to convert frames (captured fast) to string (slower), but the small performance penalty
        // is worth for achieving filtered stack traces in the user code.
        object.stack;
        return this;
    }

    definePrimordial(name, value) {
        definePrimordial(this.primordials, this.global, name, value);
        return this;
    }

    ownInterfaceOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        if (Object.prototype.hasOwnProperty.call(object, this[symbols.interface])) {
            return object[this[symbols.interface]];
        }
        return null;
    }

    ownImplementationOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        if (this[symbols.implementation].has(object)) {
            return this[symbols.implementation].get(object);
        }
        return null;
    }

    interfaceOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        if (this[symbols.interface] in object) {
            return object[this[symbols.interface]];
        }
        return null;
    }

    implementationOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        while (object != null) {
            if (this[symbols.implementation].has(object)) {
                return this[symbols.implementation].get(object);
            }
            object = Object.getPrototypeOf(object);
        }
        return null;
    }

    hasOwnImplementation(object) {
        if (object !== Object(object)) {
            return false;
        }
        return this[symbols.implementation].has(object);
    }

    hasOwnInterface(object) {
        if (object !== Object(object)) {
            return false;
        }
        return Object.prototype.hasOwnProperty.call(object, this[symbols.interface]);
    }

    hasImplementation(object) {
        if (object !== Object(object)) {
            return false;
        }
        while (object != null) {
            if (this[symbols.implementation].has(object)) {
                return true;
            }
            object = Object.getPrototypeOf(object);
        }
        return false;
    }

    hasInterface(object) {
        if (object !== Object(object)) {
            return false;
        }
        return this[symbols.interface] in object;
    }

    removeImplementationOf(object) {
        if (object !== Object(object)) {
            return this;
        }
        if (this[symbols.implementation].has(object)) {
            const implementationObject = this[symbols.implementation].get(object);
            this[symbols.implementation].delete(object);
            delete implementationObject[symbols.interface];
        }
        return this;
    }

    removeInterfaceOf(object) {
        if (object !== Object(object)) {
            return this;
        }
        if (Object.prototype.hasOwnProperty.call(object, this[symbols.interface])) {
            const interfaceObject = object[this[symbols.interface]];
            this[symbols.implementation].delete(interfaceObject);
            delete object[this[symbols.interface]];
        }
        return this;
    }

    setImplementation(interfaceObject, implementationObject) {
        if (interfaceObject !== Object(interfaceObject)) {
            throw new TypeError(`arguments[0] is not an object`);
        }
        if (implementationObject !== Object(implementationObject)) {
            throw new TypeError(`argument[1] is not an object`);
        }
        if (this.hasOwnImplementation(interfaceObject)) {
            const otherImplementation = this.ownImplementationOf(interfaceObject);
            if (otherImplementation === implementationObject) {
                return this;
            }
            throw new ReferenceError(`interfaceObject: already has an implementation`)
        }
        if (this.hasOwnInterface(implementationObject)) {
            const otherInterface = this.ownInterfaceOf(implementationObject);
            if (otherInterface === interfaceObject) {
                return this;
            }
            throw new ReferenceError(`implementationObject: already has an interface`);
        }
        this[symbols.implementation].set(interfaceObject, implementationObject);
        implementationObject[this[symbols.interface]] = interfaceObject;
        this.captureStackTraceFactory = this.compileFunction(`return function(value, context, platform) {
            platform.enterLock();
            try {
                platform.call(platform.primordials['Error.captureStackTrace'], platform.primordials.Error, value, constructor);
            } finally {
                platform.leaveLock();
            }
        }`, ['constructor']);
        this._nativeExceptionNames = [];
        for (const exceptionName of Object.getOwnPropertyNames(this.global).filter(name => /.*Error.*/.test(name))) {
            if (
                typeof global[exceptionName] === 'function' &&
                typeof this.global[exceptionName] === 'function' &&
                global[exceptionName].prototype === Object(global[exceptionName].prototype) &&
                this.global[exceptionName].prototype === Object(this.global[exceptionName].prototype)
            ) {
                this.setImplementation(this.global[exceptionName], global[exceptionName]);
                this.setImplementation(this.global[exceptionName].prototype, global[exceptionName].prototype);
                this._nativeExceptionNames.push(exceptionName);
            }
        }
        return this;
    }

    enterLock() {
        if (this[symbols.securityStack].length > 0) {
            const frameTop = this[symbols.securityStack][this[symbols.securityStack].length - 1];
            if (frameTop.lock) {
                frameTop.ref++;
                return this;
            }
        }
        this[symbols.securityStack].push({
            lock: true,
            ref: 1
        });
        native.setSecurityToken(this.global, this[symbols.lockToken]);
        this[symbols.nativeExecutor] = this.executeLockedPlatformNativeFunction;
    }

    leaveLock() {
        if (this[symbols.securityStack].length <= 0) {
            throw new Platform.LockError('The platform is not locked.');
        }
        const frameTop = this[symbols.securityStack][this[symbols.securityStack].length - 1];
        if (!frameTop.lock) {
            throw new Platform.LockError('The platform is not locked.');
        }
        if (--frameTop.ref <= 0) {
            const lastFrame = this[symbols.securityStack].pop();
            if (lastFrame !== frameTop) {
                throw new Error('Unexpected stack manipulation result.');
            }
            if (this[symbols.securityStack].length > 0) {
                const frameTop = this[symbols.securityStack][this[symbols.securityStack].length - 1];
                if (frameTop.lock) {
                    return this;
                }
            }
            native.setSecurityToken(this.global, this[symbols.unlockToken]);
            this[symbols.nativeExecutor] = this.executeUnlockedPlatformNativeFunction;
        }
        return this;
    }

    enterUnlock() {
        if (this[symbols.securityStack].length > 0) {
            const frameTop = this[symbols.securityStack][this[symbols.securityStack].length - 1];
            if (!frameTop.lock) {
                frameTop.ref++;
                return this;
            }
        }
        this[symbols.securityStack].push({
            lock: false,
            ref: 1
        });
        native.setSecurityToken(this.global, this[symbols.lockToken]);
        this[symbols.nativeExecutor] = this.executeUnlockedPlatformNativeFunction;
    }

    leaveUnlock() {
        if (this[symbols.securityStack].length <= 0) {
            throw new Platform.LockError('The platform is not unlocked.');
        }
        const frameTop = this[symbols.securityStack][this[symbols.securityStack].length - 1];
        if (frameTop.lock) {
            throw new Platform.LockError('The platform is not unlocked.');
        }
        if (--frameTop.ref <= 0) {
            const lastFrame = this[symbols.securityStack].pop();
            if (lastFrame !== frameTop) {
                throw new Error('Unexpected stack manipulation result.');
            }
            if (this[symbols.securityStack].length > 0) {
                const frameTop = this[symbols.securityStack][this[symbols.securityStack].length - 1];
                if (frameTop.lock) {
                    native.setSecurityToken(this.global, this[symbols.lockToken]);
                    this[symbols.nativeExecutor] = this.executeLockedPlatformNativeFunction;
                }
            }
        }
        return this;
    }

    static unwrapThisInterceptor(context, platform) {
        if (platform.hasImplementation(context.this)) {
            context.this = platform.implementationOf(context.this);
        }
    }

    static unwrapOwnThisInterceptor(context, platform) {
        if (context.hasOwnImplementation(context.this)) {
            context.this = context.ownImplementationOf(context.this);
        }
    }

    static unwrapArgumentsInterceptorFactory(...indices) {
        return function unwrapArgumentsInterceptor(context, platform) {
            for (const index of indices) {
                if (platform.hasImplementation(context.arguments[index])) {
                    context.arguments[index] = platform.implementationOf(context.arguments[index]);
                }
            }
        };
    }

    static unwrapOwnArgumentsInterceptorFactory(...indices) {
        return function unwrapOwnArgumentsInterceptor(context, platform) {
            for (const index of indices) {
                if (platform.hasOwnImplementation(context.arguments[index])) {
                    context.arguments[index] = platform.ownImplementationOf(context.arguments[index]);
                }
            }
        };
    }

    static unwrapAllArgumentsInterceptor(context, platform) {
        for (let index = 0, length = context.arguments.length; index < length; ++index) {
            if (platform.hasImplementation(context.arguments[index])) {
                context.arguments[index] = platform.implementationOf(context.arguments[index]);
            }
        }
    }

    static unwrapOwnAllArgumentsInterceptor(context, platform) {
        for (let index = 0, length = context.arguments.length; index < length; ++index) {
            if (platform.hasOwnImplementation(context.arguments[index])) {
                context.arguments[index] = platform.ownImplementationOf(context.arguments[index]);
            }
        }
    }

    static wrapReturnValueInterceptor(value, context, platform) {
        if (platform.hasInterface(value)) {
            return platform.interfaceOf(value);
        }
        return value;
    }

    static wrapOwnReturnValueInterceptor(value, context, platform) {
        if (platform.hasOwnInterface(value)) {
            return platform.ownInterfaceOf(value);
        }
        return value;
    }

    static enterUnlockInterceptor(context, platform) {
        platform.enterUnlock();
    }

    static leaveUnlockInterceptor(context, platform) {
        platform.leaveUnlock();
    }

    /* There is no secure way to call Function.prototype.{call|apply|bind} from within the user code.
     * Therefore, we provide platform.{call|apply|bind} which uses the trusted Function.prototype.{call|apply|bind}
     * from the current context.
     */

    call(func, ...args) {
        return Function.prototype.call.call(func, ...args);
    }

    apply(func, ...args) {
        return Function.prototype.apply.call(func, ...args);
    }

    bind(func, ...args) {
        return Function.prototype.bind.call(func, ...args);
    }

    executeUnlockedPlatformNativeFunction(callee, ...args) {
        return callee(this, ...args);
    }

    executeLockedPlatformNativeFunction(callee, ...args) {
        this.enterUnlock();
        try {
            return callee(this, ...args);
        } catch (e) {
            if (e !== Object(e)) {
                throw e;
            }
            if (native.getCreationContextGlobal(e) === this.global) {
                throw e;
            }
            if (this.hasOwnInterface(e)) {
                do {
                    e = this.ownInterfaceOf(e);
                } while (this.hasOwnInterface(e));
                throw e;
            }
            const ep = Object.getPrototypeOf(e);
            if (this[symbols.exceptionMap].has(ep)) {
                e = this[symbols.exceptionMap].get(ep)(this, e);
            }
            throw e;
        } finally {
            this.leaveUnlock();
        }
    }
}

const interceptorNames = ['before', 'after', 'catch', 'finally'];

const interceptorFlag = {
    before: 1,
    after: 2,
    catch: 4,
    finally: 8
};

const interceptorArgName = {
    before: 'before',
    after: 'after',
    catch: 'onCatch',
    finally: 'onFinally'
}

const allInterceptorFlag = Object.keys(interceptorFlag).reduce((flag, key) => flag | interceptorFlag[key], 0);

function arrayInterceptorsWithReturn(interceptors) {
    return function forEachInterceptor(value, context, platform) {
        for (const interceptor of interceptors) {
            value = interceptor(value, context, platform);
        }
        return value;
    };
}

function arrayInterceptorsWithoutReturn(interceptors) {
    return function forEachInterceptor(context, platform) {
        for (const interceptor of interceptors) {
            interceptor(context, platform);
        }
    };
}

Platform.LockError = class LockError extends Error {
    name = 'Platform.LockError';
}

const getFactory = (function () {
    const factories = [];
    return function (elements) {
        if (elements >= 0) {
            if (typeof factories[elements] !== 'function') {
                const factory = generateFactoryFunctionCode(elements);
                factories[elements] = new Function(...factory.args, factory.code.join('\n'));
            }
            return factories[elements];
        }
    };

    function generateFactoryFunctionCode(elements) {
        let code = generateFactoryCode(elements);
        const interceptors = generateFactoryInterceptors(elements);
        const fnName = 'executeNativeInternal' + interceptors.map(s => s.substr(0, 1).toUpperCase() + s.substr(1)).join('');
        code = [
            `return function ${fnName}(platform, _this, _arguments, _newTarget) {`,
            ...code,
            '}'
        ];
        return {
            code,
            interceptors,
            args: ['implementation', 'context', ...interceptors]
        };
    }

    function generateFactoryInterceptors(elements) {
        const interceptors = [];
        for (const interceptorName of ['before', 'after', 'catch', 'finally']) {
            if (elements & interceptorFlag[interceptorName]) {
                interceptors.push(interceptorArgName[interceptorName]);
            }
        }
        return interceptors;
    }

    function generateFactoryCode(elements) {
        const hasTry = elements & (interceptorFlag.catch | interceptorFlag.finally);
        const hasEntry = elements & allInterceptorFlag;
        let code = hasEntry ? 'entry.this, entry.arguments' : 'this, arguments';
        code = `platform.apply(implementation, ${code})`;
        if (elements & interceptorFlag.after) {
            code = `after(${code}, entry, platform)`;
        }
        code = [`${indent(hasTry ? 2 : 1)}return ${code}`];
        if (elements & interceptorFlag.before) {
            code.unshift(`${indent(hasTry ? 2 : 1)}before(entry, platform);`);
        }
        if (hasTry) {
            code.unshift(`${indent(1)}try {`);
            if (elements & interceptorFlag.catch) {
                code.push(
                    `${indent(1)}} catch(exception) {`,
                    `${indent(2)}throw onCatch(exception, entry, platform);`
                );
            }
            if (elements & interceptorFlag.finally) {
                code.push(
                    `${indent(1)}} finally {`,
                    `${indent(2)}onFinally(entry, platform);`
                );
            }
            code.push(`${indent(1)}}`);
        }
        if (hasEntry) {
            code.unshift(
                `${indent(1)}const entry = Object.assign(Object.create(context), {`,
                `${indent(2)}this: _this,`,
                `${indent(2)}arguments: _arguments,`,
                `${indent(2)}newTarget: _newTarget`,
                `${indent(1)}});`
            );
        }
        return code;
    }

    function indent(count) {
        let s = '';
        while (count-- > 0) {
            s += '    ';
        }
        return s;
    }
})();

function createNativeFunctionWrapper(wrapper) {
    return function executePlatformNativeFunction(platform, _this, _arguments, _newTarget) {
        return platform[symbols.nativeExecutor](wrapper, _this, _arguments, _newTarget);
    };
}

function globalConstructorGuard(platform, _this, _arguments, _newTarget) {
    throw new platform.primordials.TypeError('Illegal constructor');
}

function translateErrorToPlatform(name) {
    return function wrapError(platform, error) {
        const translated = new platform.primordials[name](error.message);
        platform.captureStackTrace(translated, platform[symbols.stackCapture]);
        platform.setImplementation(translated, error);
        return translated;
    };
}

function translateAggregateErrorToPlatform(platform, error) {
    const translateList = new platform.primordials.Array();
    for (const innerError of error.errors) {
        if (innerError !== Object(innerError) || native.getCreationContextGlobal(innerError) === platform.global) {
            Array.prototype.push.call(translateList, innerError);
        } else if (platform.hasInterface(innerError)) {
            Array.prototype.push.call(translateList, platform.interfaceOf(innerError));
        } else {
            const prototype = Object.getPrototypeOf(error);
            if (platform[symbols.exceptionMap].has(prototype)) {
                const translatedError = platform[symbols.exceptionMap].get(prototype)(platform, innerError);
                Array.prototype.push.call(translateList, translatedError);
            }
        }
    }
}
