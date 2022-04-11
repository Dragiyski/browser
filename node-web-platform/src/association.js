export default class Association {
    #interface = Symbol('interface');
    #implementation = new WeakMap();

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
};

Object.setPrototypeOf(Association.prototype, null);
