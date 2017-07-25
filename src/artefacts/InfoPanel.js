import $ from '../libs/jquery.js';
import {NgModule, Input, Output, ElementRef, EventEmitter} from '@angular/core';
import {ColorPickerModule} from 'angular2-color-picker'
import {FormsModule}       from '@angular/forms';
import {NguiAutoCompleteModule} from '@ngui/auto-complete';
import {isFunction} from 'lodash-bound';
import chroma from 'chroma-js';

import ExtensibleComponent from './ExtensibleComponent.js';

import {lyphDataByName} from '../data.js';


/**
 * The info-panel component.
 */
const Component = ExtensibleComponent; // to get WebStorm syntax highlighting
@Component({
	selector: 'info-panel',
	styles: [`

		:host {
			display: block;
			padding: 4px;
			position: relative;
		}
		
		.header {
			display: flex;
			align-items: center;
		}
		
		.header > button {
			border: solid 1px;
			border-radius: 6px 0 0 0;
			width: 30px;
			position: absolute;
			top:  4px;
			left: 4px;
			outline: none;
			height: 19px;
		}
		
		.header.no-auto-complete >>> ngui-auto-complete {
			display: none !important;
		}
		
		.header >>> .ngui-auto-complete-wrapper {
			margin-left: 29px;
			width: calc(100% - 29px);
			border: none !important;
			padding: 0 !important;
			height: 19px;
		}
		
		.header input[type="text"] {
			width: 100%;
			padding-left: 3px;
			border-radius: 0 6px 0 0;
			border: solid 1px;
			font-weight: bold;
			outline: none;
			height: 19px;
		}
		
		.header input[type="text"]:focus {
			background-color: white !important;
		}
		
		.other-fields {
			border-style: none solid solid solid;
			border-width: 1px;
			border-radius: 0 0 6px 6px;
			margin-top: -8px;
			padding: 12px 4px 4px 4px;
			background-color: white;
		}
		
		.other-fields table td:nth-child(1) {
			font-size: 14px;
		}
		
		.other-fields table td:nth-child(2) {
			position: relative;
		}
		
		.other-fields table select              ,
		.other-fields table input[type="text"]  ,
		.other-fields table .input              {
			display: inline-block;
			width: 100%;
			margin: 0;
			padding: 0 2px;
			border-style: none none solid solid;
			border-width: 1px;
			background-color: transparent;
			outline: none;
		}
		
		.other-fields table .input.disabled {
			background-color: #ECEAE1 !important;
			color: gray;
			cursor: default;
		}
		
		.other-fields table .input > input[type="number"] {
			width: 2em;
			border: none;
			background-color: transparent !important;
		}
		
	`],
	template: `

		<div class="header" [class.no-auto-complete]=" model.wasSetFromData || autoCompleteOptions.length === 0 ">
		
			<button [colorPicker]            = " model.color                        "
					(colorPickerChange)      = " readonly || (model.color = $event) "
					[cpPosition]             = " 'left'                             "
					[cpPositionOffset]       = " '5px'                              "
					[cpAlphaChannel]         = " 'disabled'                         "
			        [style.background-color] = " model.color                        "
			        [style.color]            = " contrastingColor             "
			        [style.border-color]     = " darkenedColor                "
			        (cpToggleChange)         = " colorPickerOpen.next($event)       ">
				<span class="button-symbol" [innerHTML]="symbol"></span>
			</button>
			
			<input class="name" type="text" placeholder="Name"
			       [disabled]           = " readonly || model.wasSetFromData "
				   [(ngModel)]          = " model.name                       "
			       [style.border-color] = " darkenedColor              "
			       auto-complete
			       [source]       = " autoCompleteOptions    "
			       (valueChanged) = " onDataSelected($event) "/>
			     
		</div>
	`
})
export class InfoPanel {
	
	get autoCompleteOptions() { return [] }
	
	get symbol() { return '' }
	
	@Input() model;
	
	@Input() readonly = false;
	
	@Input() modelsById = {};
	
	@Input() buttonSymbol = '';
	
	@Output() colorPickerOpen = new EventEmitter;
	
	@Output() init = new EventEmitter;
	
	contrastingColor: string = 'black';
	darkenedColor: string    = 'gray';
	
	constructor({nativeElement}: ElementRef) {
		this.nativeElement = $(nativeElement);
	}
	
	ngOnInit() {
		/* when the model is selected, give a nice focus effect to the name box */
		if (this.model.p::isFunction()) {
			this.model.p('selected').subscribe((s) => {
				this.nativeElement.find('input.name').css(
					'background-color',
					s ? 'var(--boxer-highlight-color)' : ''
				)
			});
		}
		
		/* keep track of colors */
		this.model.p('color').subscribe((color) => {
			const c = chroma(color);
			if (c.luminance() < 0.5) {
				this.contrastingColor = c.luminance(0.9).hex();
			} else {
				this.contrastingColor = c.luminance(0.1).hex();
			}
			this.darkenedColor = c.darken(2).hex();
		});
		
		/* focus on controls --> selected model */
		this.nativeElement.mouseenter (() => {
			this.model.selected = true;
		});
		this.nativeElement.mouseleave (() => {
			this.model.selected = false;
		});
		
		/* make sure the auto-complete drop-down keeps the foreground when visible */
		const defaultZIndex = this.nativeElement.css('z-index');
		this.nativeElement.focusin(() => {
			this.nativeElement.css('z-index', 100);
		});
		this.nativeElement.focusout(() => {
			this.nativeElement.css('z-index', defaultZIndex);
			this.nativeElement.find('ngui-auto-complete').hide();
		});
		
		/* fire init event */
		this.init.next();
	}
	
	onDataSelected(name) {
		const condition =
			lyphDataByName[name] &&
			!this.model.wasSetFromData;
		if (condition) {
			this.model.setFromData(lyphDataByName[name], {modelsById: this.modelsById});
		}
	}
	
}

/**
 *
 */
@NgModule({
	imports: [
		FormsModule,
		ColorPickerModule,
		NguiAutoCompleteModule
	],
	declarations: [InfoPanel],
	exports:      [
		InfoPanel,
		NguiAutoCompleteModule
	]
})
export class InfoPanelModule {}

