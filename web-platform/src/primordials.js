/**
 * Copy "primordials" from a global object. This must be involed immediately after creation of the context, with a real
 * global object. This is not the object passed to the `vm` functions. To get the actual global, execute:
 * ```javascript
 * vm.runInContext('globalThis', vm_context);
 * ```
 * and use the returned value for a global object.
 * 
 * If this is called after the object creation, it should make a snapshot of the all properties in the global environment
 * reachable without executing any code. Values for objects retrieved by getters and setters is not considered. In order,
 * for the snapshot to capture primordials, this must be done before any javascript that can modify the environment is
 * executed (the example above with 'globalThis' does not modify the environment).
 * 
 * The primordials can be used in many ways and are resistant to modification of the environment by any code later.
 * 
 * The primordials are added as read-only properties, as the distination primordials object is not indended to be modified.
 * However, the caller is considered trusted, so the properties are enumerable, which means they can be redefined, if such
 * necessity arises.
 * 
 * @param {object} primordials The object to store the primordials in.
 * @param {object} global A real global object.
 */
export function copyPrimordials(primordials, global) {
    copyAll(primordials, '', global);

}

function copyAll(primordials, prefix, source, ...stack) {
    if (stack.indexOf(source) >= 0) {
        return;
    }
    for (const name of Object.getOwnPropertyNames(source)) {
        const descriptor = Object.getOwnPropertyDescriptor(source, name);
        copyProperty(primordials, `${prefix}${name}`, descriptor);
        if (descriptor.value === Object(descriptor.value)) {
            copyAll(primordials, `${prefix}${name}.`, descriptor.value, ...stack, source);
        }
    }
}

function copyProperty(primordials, primordialName, descriptor) {
    if (Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        Object.defineProperty(primordials, primordialName, {
            configurable: true,
            enumerable: true,
            value: descriptor.value
        });
    } else if (Object.prototype.hasOwnProperty.call(descriptor, 'get')) {
        const getter = descriptor.get;
        Object.defineProperty(primordials, `${primordialName}[[get]]`, {
            configurable: true,
            enumerable: true,
            value: getter
        });
        if (Object.prototype.hasOwnProperty.call(descriptor, 'set')) {
            const setter = descriptor.set;
            Object.defineProperty(primordials, `${primordialName}[[set]]`, {
                configurable: true,
                enumerable: true,
                value: setter
            });
        }
    }
}

export function definePrimordial(primordials, global, name, value) {
    copyProperty(primordials, name, { value });
    copyAll(primordials, `${name}.`, value);
}