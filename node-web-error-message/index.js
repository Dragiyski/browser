export function argumentTypeMismatchError(index, type) {
    return `parameter ${index} is not of type '${type}'.`;
}

export function argumentCountError(minimum, current) {
    return `${minimum} arguments required, but only ${current} present.`;
}

export function augmentMessage(prefix, error) {
    error.message = `${prefix}: ${error.message}`;
    return error;
}

export function domNewRequiredError(className) {
    return `Failed to construct '${className}': Please use the 'new' operator, this DOM object constructor cannot be called as a function.`;
}

export function failedToConstruct(className, errorMessage) {
    return `Failed to construct '${className}': ${errorMessage}`;
}