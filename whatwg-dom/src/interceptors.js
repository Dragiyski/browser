export function validateNativeInvocation(Interface, Implementation) {
    return function validateNativeIntercetor(context, platform) {
        if (!Function.prototype[Symbol.hasInstance].call(Interface, context.this) || !(platform.implementationOf(context.this) instanceof Implementation)) {
            throw new platform.primordials.TypeError('Illegal invocation');
        }
    };
}

export function validateClassInvocation(name) {
    return function validateClassInterceptor(context, platform) {
        if (context.newTarget == null) {
            throw new platform.primordials.TypeError(`Failed to construct '${name}': Please use the 'new' operator, this DOM object constructor cannot be called as a function.`);
        }
    };
}

export function validateClassImplementation(Implementation) {
    return function (context, platform) {
        if (context.newTarget == null || platform.implementationOf(context.newTarget) !== Implementation || platform.implementationOf(context.newTarget.prototype) !== Implementation.prototype) {
            throw new platform.primordials.TypeError(`Illegal constructor`);
        }
    };
}