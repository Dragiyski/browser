import { argumentCountError } from '@dragiyski/node-web-error-message';
import { Platform } from '@dragiyski/node-web-platform';
import Event from './Event.js';

class CustomEventImpl extends Event[Platform.concept.class] {
    detail = null;

    static convertToDictionary(dictionary) {
        const eventInit = super.convertToDictionary(dictionary);
        eventInit.detail = dictionary?.detail;
        return eventInit;
    }
}

export default class CustomEvent extends Event {
    static [Platform.concept.class] = CustomEventImpl;

    get detail() {
        return this[Platform.concept.object].detail;
    }

    initCustomEvent(type, bubbles = false, cancelable = false, detail = null) {
        if (arguments.length < 1) {
            throw new TypeError(argumentCountError(1, arguments.length));
        }
        if (this[Platform.concept.object].dispatchFlag) {
            return;
        }
        this[Platform.concept.object].initialize(type, bubbles, cancelable);
        this[Platform.concept.object].detail = detail;
    }
}
