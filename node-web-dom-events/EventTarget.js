/* eslint-disable camelcase */
import { argumentCountError, argumentTypeMismatchError } from '@dragiyski/node-web-error-message';
import { Platform } from '@dragiyski/node-web-platform';

export const concept_eventListenerList = Symbol('event listener list');
export const concept_getTheParent = Symbol('get the parent');
export const concept_activationBehavior = Symbol('activation behavior');

class EventTarget {
    [concept_eventListenerList] = [];
}
