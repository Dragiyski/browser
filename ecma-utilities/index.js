export function lazyPrototypeProperty(object, name, getter) {
    Object.defineProperty(object, name, {
        configurable: true,
        enumerable: true,
        get() {
            const value = getter.call(this);
            Object.defineProperty(this, name, {
                configurable: true,
                enumerable: true,
                writable: true,
                value
            });
            return value;
        },
        set(value) {
            Object.defineProperty(this, name, {
                configurable: true,
                enumerable: true,
                writable: true,
                value
            });
        }
    });
};

export function isSubclassOrSelf(Class, Target) {
    if (typeof Target !== 'function') {
        return false;
    }
    while(Class != null) {
        if (Class === Target) {
            return true;
        }
        Class = Object.getPrototypeOf(Class);
    }
    return false;
}

export function isSubclass(Class, Target) {
    return isSubclassOrSelf(Class, Target) && Class !== Target;
}
