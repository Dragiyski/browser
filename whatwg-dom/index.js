import DOMException from "./src/DOMException.js";
import Event from "./src/Event.js";

export default function (platform) {
    const agent = platform.implementationOf(platform);
    agent.DOM = Object.create(null);
    DOMException(platform);
    Event(platform);
}