const Rx = window.Rx;
export default Rx;
export const Observable      = Rx.Observable;
export const Subject         = Rx.Subject;
export const BehaviorSubject = Rx.BehaviorSubject;

export class RequestAnimationFrameDefinition {
    constructor() {
        if (window.requestAnimationFrame) {
            this.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
            this.requestAnimationFrame = window.requestAnimationFrame.bind(window);
        }
        else if (window.mozRequestAnimationFrame) {
            this.cancelAnimationFrame = window.mozCancelAnimationFrame.bind(window);
            this.requestAnimationFrame = window.mozRequestAnimationFrame.bind(window);
        }
        else if (window.webkitRequestAnimationFrame) {
            this.cancelAnimationFrame = window.webkitCancelAnimationFrame.bind(window);
            this.requestAnimationFrame = window.webkitRequestAnimationFrame.bind(window);
        }
        else if (window.msRequestAnimationFrame) {
            this.cancelAnimationFrame = window.msCancelAnimationFrame.bind(window);
            this.requestAnimationFrame = window.msRequestAnimationFrame.bind(window);
        }
        else if (window.oRequestAnimationFrame) {
            this.cancelAnimationFrame = window.oCancelAnimationFrame.bind(window);
            this.requestAnimationFrame = window.oRequestAnimationFrame.bind(window);
        }
        else {
            this.cancelAnimationFrame = window.clearTimeout.bind(window);
            this.requestAnimationFrame = function (cb) { return window.setTimeout(cb, 1000 / 60); };
        }
    }
}
export const AnimationFrame = new RequestAnimationFrameDefinition();
