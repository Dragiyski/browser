export function validateNativeInvocation(Interface, Implementation) {
    return function validateNativeIntercetor(context, platform) {
        if (!Function.prototype[Symbol.hasInstance].call(Interface, context.this) || !(platform.implementationOf(context.this) instanceof Implementation)) {
            throw new platform.primordials.TypeError('Illegal invocation');
        }
    };
}

export function validateClassInvocation(name) {
    return function validateClassInterceptor(context, platform) {
        if (context.target == null) {
            throw new platform.primordials.TypeError(`Failed to construct '${name}': Please use the 'new' operator, this DOM object constructor cannot be called as a function.`);
        }
    };
}

export function validateClassImplementation(Implementation) {
    return function (context, platform) {
        if (context.target == null || platform.implementationOf(context.target) !== Implementation || platform.implementationOf(context.target.prototype) !== Implementation.prototype) {
            throw new platform.primordials.TypeError(`Illegal constructor`);
        }
    };
}
export function minimumNumberOfMethodArguments(count, methodName, className) {
    return function (context, platform) {
        if (context.arguments.length < count) {
            throw new platform.primordials.TypeError(`Failed to execute '${methodName}' on '${className}': ${count} argument required, but only ${context.arguments.length} present.`)
        }
    };
}

export function minimumNumberOfConstructorArguments(count, className) {
    return function (context, platform) {
        if (context.arguments.length < count) {
            throw new platform.primordials.TypeError(`Failed to construct '${className}': ${count} argument required, but only ${context.arguments.length} present.`);
        }
    }
}

export function validateMethodArgumentTypeAndUnwrap(className, methodName, index, typeName, Interface, Implementation) {
    return function (context, platform) {
        const value = context.arguments[index];
        if (Function.prototype[Symbol.hasInstance].call(Interface, value)) {
            const impl = platform.implementationOf(value);
            if (impl instanceof Implementation) {
                context.arguments[index] = impl;
                return;
            }
        }
        throw new platform.primordials.TypeError(`Failed to execute '${methodName}' on '${className}': parameter ${index + 1} is not of type '${typeName}'.`)
    };
}
