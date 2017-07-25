import {NgModule, Component, ElementRef} from '@angular/core';
import {ColorPickerModule} from 'angular2-color-picker'
import {FormsModule}       from '@angular/forms';

import {InfoPanel, InfoPanelModule} from './InfoPanel';



/**
 * The info-panel component.
 */
@Component({
	selector: 'process-info-panel',
	styles: [...InfoPanel.ComponentAnnotation.styles, `
		
		.header > button > .button-symbol {
			display: block;
			margin-top: -1px;
		}
		
	`],
	template: `

		${InfoPanel.ComponentAnnotation.template}
		
		<div class="other-fields" [style.border-color]=" darkenedColor ">
			
			<table>
				<tr>
					<td>Type</td>
					<td>
						<select placeholder="Type"
							[(ngModel)]          = " model.type          "
							[disabled]           = " readonly            "
							[style.border-color] = " darkenedColor "
						>
							<option value="blood"    > Blood               </option>
							<option value="cytosol"  > Cytosol             </option>
							<option value="csf"      > Cerebrospinal Fluid </option>
							<option value="urine"    > Urine               </option>
							<option value="bio-fluid"> Biological Fluid    </option>
						</select>
					</td>
			</table>
			
			
			
		</div>
		
	`
})
export class ProcessInfoPanel extends InfoPanel {
	
	get symbol() { return '&#8886;' }
	
	constructor(elementRef: ElementRef) {
		super(elementRef);
	}
	
}

/**
 *
 */
@NgModule({
	imports: [
		FormsModule,
		ColorPickerModule,
		InfoPanelModule
	],
	declarations: [ProcessInfoPanel],
	exports:      [ProcessInfoPanel]
})
export class ProcessInfoPanelModule {}
