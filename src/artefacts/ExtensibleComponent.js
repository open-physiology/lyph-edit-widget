import {Component} from '@angular/core';

export default function ExtensibleComponent(options) {
	return (target) => {
		target.ComponentAnnotation = options;
		return Component(options)(target);
	};
}
