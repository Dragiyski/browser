import CustomEvent from './CustomEvent.js';
import DOMException from './DOMException.js';
import Event from './Event.js';

export default function (platform) {
    const agent = platform.implementationOf(platform);
    agent.DOM = Object.create(null);
    // TODO: This is generally good idea, but it will generate one implementation per platform.
    // Instead the implementations should be separate classes, with each platform having the ability to define separate public interfaces.
    // There is no problem a single class to be linked to more than one interface, as each link exists within a platform object itself.

    // To access the platform, we might introduce static Platform.getCurrentPlatform() that returns the current platform in a platform stack.
    DOMException(platform);
    Event(platform);
    CustomEvent(platform);
}
