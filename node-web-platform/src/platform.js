import { lazyPrototypeProperty } from '@dragiyski/ecma-utilities';
import Association from './association.js';
import { argumentCountError } from '@dragiyski/node-web-error-message';

export default class Platform {
    static #platformStack = [];
    static realm = Object.create(null);
    #interface = Symbol('interface');
    #implementation = new WeakMap();
    static #namespace = Object.create(null);
    static #constrcutor = Symbol('constructor');

    constructor() {
        Object.defineProperties(this, {
            /**
             * @type {Association}
             * Used to associate public interface with corrensponding implementation.
             * No additional properties will be attached to the public interface.
             */
            association: {
                value: new Association()
            }
        });
    }

    static enter(platform) {
        if (!(platform instanceof Platform)) {
            throw new TypeError('Invalid `arguments[0]`: expected `Platform` instance');
        }
        if (Platform.#platformStack.length > 0) {
            const top = Platform.#platformStack[0];
            if (top.platform === platform) {
                ++top.ref;
                return this;
            }
        }
        this.#platformStack.unshift({
            platform,
            ref: 1
        });
        return this;
    }

    static leave(platform) {
        if (Platform.#platformStack.length > 0) {
            const top = Platform.#platformStack[0];
            if (top.platform === platform) {
                if (--top.ref <= 0) {
                    Platform.#platformStack.shift();
                }
                return this;
            }
        }
        throw new ReferenceError(`Platform stack violation`);
    }

    /**
     * @returns {Platform}
     */
    static current() {
        if (Platform.#platformStack.length > 0) {
            const top = Platform.#platformStack[0];
            return top.platform;
        }
        throw new Platform.RuntimeError('Current execution context is not in a web platform');
    }

    static initialize(...args) {
        if (args.length < 2) {
            throw new TypeError(argumentCountError(2, arguments.length));
        }
        const callback = args.pop();
        if (typeof callback !== 'function') {
            throw new TypeError('Expected the last argument to be a function');
        }
        let object = this.#namespace;
        for (const key of args) {
            object = object[key] ??= Object.create(null);
        }
        const previous = object[this.#constrcutor];
        object[this.#constrcutor] = callback;
        return previous;
    }

    function(callee, { name = '' } = {}) {
        return getFactory({ name })(this, callee);
    }

    ownInterfaceOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        if (Object.prototype.hasOwnProperty.call(object, this.#interface)) {
            return object[this.#interface];
        }
        return null;
    }

    ownImplementationOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        if (this.#implementation.has(object)) {
            return this.#implementation.get(object);
        }
        return null;
    }

    interfaceOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        if (this.#interface in object) {
            return object[this.#interface];
        }
        return null;
    }

    implementationOf(object) {
        if (object !== Object(object)) {
            return null;
        }
        while (object != null) {
            if (this.#implementation.has(object)) {
                return this.#implementation.get(object);
            }
            object = Object.getPrototypeOf(object);
        }
        return null;
    }

    hasOwnImplementation(object) {
        if (object !== Object(object)) {
            return false;
        }
        return this.#implementation.has(object);
    }

    hasOwnInterface(object) {
        if (object !== Object(object)) {
            return false;
        }
        return Object.prototype.hasOwnProperty.call(object, this.#interface);
    }

    hasImplementation(object) {
        if (object !== Object(object)) {
            return false;
        }
        while (object != null) {
            if (this.#implementation.has(object)) {
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
        return this.#interface in object;
    }

    removeImplementationOf(object) {
        if (object !== Object(object)) {
            return this;
        }
        if (this.#implementation.has(object)) {
            const implementationObject = this.#implementation.get(object);
            this.#implementation.delete(object);
            delete implementationObject[this.#interface];
        }
        return this;
    }

    removeInterfaceOf(object) {
        if (object !== Object(object)) {
            return this;
        }
        if (Object.prototype.hasOwnProperty.call(object, this.#interface)) {
            const interfaceObject = object[this.#interface];
            this.#implementation.delete(interfaceObject);
            delete object[this.#interface];
        }
        return this;
    }

    setImplementation(interfaceObject, implementationObject) {
        if (interfaceObject !== Object(interfaceObject) || implementationObject !== Object(implementationObject)) {
            throw new TypeError(`Implementation linking can only be realized between two objects`);
        }
        if (this.hasOwnImplementation(interfaceObject)) {
            const otherImplementation = this.ownImplementationOf(interfaceObject);
            if (otherImplementation === implementationObject) {
                return this;
            }
            throw new ReferenceError(`interfaceObject: already has an implementation in this platform`);
        }
        if (this.hasOwnInterface(implementationObject)) {
            const otherInterface = this.ownInterfaceOf(implementationObject);
            if (otherInterface === interfaceObject) {
                return this;
            }
            throw new ReferenceError(`implementationObject: already has an interface in this platform`);
        }
        this.#implementation.set(interfaceObject, implementationObject);
        implementationObject[this.#interface] = interfaceObject;
        return this;
    }

    initialize() {
        const platform = this;
        visit(Platform.#namespace);
        return this;
        function visit(object) {
            for (const name in object) {
                visit(object[name]);
            }
            if (Platform.#constrcutor in object) {
                const callee = object[Platform.#constrcutor];
                callee(platform);
            }
        }
    }
}

Platform.RuntimeError = class RuntimeError extends Error {
    name = 'Platform.RuntimeError';
};

{
    const assigner = new Proxy(Object.create(null), {
        defineProperty() {
            return false;
        },
        deleteProperty() {
            return false;
        },
        isExtensible() {
            return true;
        },
        preventExtensions() {
            return false;
        },
        get(target, name, receiver) {
            if (Object.prototype.hasOwnProperty.call(receiver, name)) {
                return receiver[name];
            }
            if (typeof name !== 'string') {
                return;
            }
            const path = name.split('.');
            let object = global;
            while (path.length > 1) {
                const property = path.shift();
                object = object[property];
                if (object !== Object(object)) {
                    return;
                }
            }
            if (path[0] in object) {
                const value = object[path[0]];
                Object.defineProperty(receiver, name, {
                    configurable: true,
                    writable: true,
                    value
                });
                return value;
            }
        },
        has(target, name) {
            if (typeof property !== 'string') {
                return false;
            }
            name = name.split('.');
            let object = global;
            while (name.length > 1) {
                const property = name.shift();
                object = object[property];
                if (object !== Object(object)) {
                    return false;
                }
            }
            return name[0] in object;
        }
    });
    Object.defineProperty(Platform.prototype, 'primordials', {
        value: Object.create(assigner)
    });
}

lazyPrototypeProperty(Platform.prototype, 'global', () => Object.create(null));
lazyPrototypeProperty(Platform.prototype, 'realm', () => Object.create(null));

function getFactory({ name = '' } = {}) {
    return function (platform, callee) {
        const caller = makeCaller(platform, callee);
        if (typeof name === 'string' && name.length > 0) {
            Object.defineProperty(caller, 'name', {
                configurable: true,
                value: name
            });
        }
        return caller;
    };
    function makeCaller(platform, callee) {
        return function (...args) {
            return callee(platform, this, args, new.target);
        };
    }
}

Platform.enter(new Platform());
