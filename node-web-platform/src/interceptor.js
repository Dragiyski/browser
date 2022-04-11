export function returnValueInterfaceInterceptor(callee) {
    return function returnValueInterface(platform, ...rest) {
        const value = callee(platform, ...rest);
        return platform.interfaceOf(value) ?? value;
    };
}

export function returnValueOwnInterfaceInterceptor(callee) {
    return function returnValueOwnInterface(platform, ...rest) {
        const value = callee(platform, ...rest);
        return platform.ownInterfaceOf(value) ?? value;
    };
}

export function newTargetImplementationInterceptor(callee) {
    return function newTargetImplementation(platform, self, parameter, target, ...more) {
        target = platform.implementationOf(target);
        return callee(platform, self, parameter, target, ...more);
    };
}

export function newTargetOwnImplementationInterceptor(callee) {
    return function newTargetOwnImplementation(platform, self, parameter, target, ...more) {
        target = platform.ownImplementationOf(target);
        return callee(platform, self, parameter, target, ...more);
    };
}

export function requireThisImplementationInterceptor(callee) {
    return function thisImplementation(platform, self, ...more) {
        self = platform.implementationOf(self);
        if (self == null) {
            throw new TypeError('Illegal invocation');
        }
        return callee(platform, self, ...more);
    };
};

export function requireThisOwnImplementationInterceptor(callee) {
    return function thisImplementation(platform, self, ...more) {
        self = platform.ownImplementationOf(self);
        if (self == null) {
            throw new TypeError('Illegal invocation');
        }
        return callee(platform, self, ...more);
    };
};

export function validateThisImplementationInterceptor(callee, Class) {
    return function thisImplementation(platform, self, ...more) {
        self = platform.implementationOf(self);
        if (!(self instanceof Class)) {
            throw new TypeError('Illegal invocation');
        }
        return callee(platform, self, ...more);
    };
}

export function validateThisOwnImplementationInterceptor(callee, Class) {
    return function thisImplementation(platform, self, ...more) {
        self = platform.ownImplementationOf(self);
        if (!(self instanceof Class)) {
            throw new TypeError('Illegal invocation');
        }
        return callee(platform, self, ...more);
    };
}

export function makeRegularInterceptor(callee) {
    return function regular(platform, self, args) {
        return Reflect.apply(callee, self, args);
    };
}
