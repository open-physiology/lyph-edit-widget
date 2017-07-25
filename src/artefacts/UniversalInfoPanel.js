import {NgModule, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ColorPickerModule} from 'angular2-color-picker'

import ExtensibleComponent from './ExtensibleComponent.js';

import {LyphInfoPanelModule} from './LyphInfoPanel';
import {ProcessInfoPanelModule} from './ProcessInfoPanel';


const Component = ExtensibleComponent; // to get WebStorm syntax highlighting

/**
 * The universal-info-panel component.
 */
@Component({
	selector: 'universal-info-panel',
	styles: [],
	template: `

		<lyph-info-panel
			*ngIf             = " model && model.class === 'LyphModel' "
			[readonly]        = " readonly                             "
			[model]           = " model                                "
			[class.info-panel]= " true                                 "
			[class.visible]   = " !model.deleted                       "
			(colorPickerOpen) = " colorPickerOpen.next($event)         "
		></lyph-info-panel>
		
		<process-info-panel
			*ngIf             = " model && model.class === 'ProcessModel' "
			[readonly]        = " readonly                                "
			[model]           = " model                                   "
			[class.info-panel]= " true                                    "
			[class.visible]   = " !model.deleted                          "
			(colorPickerOpen) = " colorPickerOpen.next($event)            "
		></process-info-panel>

	`
})
export class UniversalInfoPanel {
	
	@Input() model;
	
	@Input() readonly = false;
	
	@Output() colorPickerOpen = new EventEmitter;
		
}

/**
 *
 */
@NgModule({
	imports: [
		LyphInfoPanelModule,
		ProcessInfoPanelModule,
		CommonModule
	],
	declarations: [UniversalInfoPanel],
	exports:      [
		UniversalInfoPanel
	]
})
export class UniversalInfoPanelModule {}

