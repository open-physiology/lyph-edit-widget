import {NgModule, Directive, Input, ElementRef} from '@angular/core';

import $ from './libs/jquery.js';

import {Canvas, Coach} from 'boxer';

import {MoveTool, ResizeTool, HighlightTool, MouseCursorTool, ClickTool, RotateTool, DrawTool, DeleteTool, SelectTool, PanTool, ZoomTool} from 'boxer';
import {property, which} from 'utilities';

import KeyCode from 'keycode-js';
import {LyphBox} from './artefacts/LyphBox';
import {ProcessChain} from './artefacts/ProcessChain';
import {ProcessNode}  from './artefacts/ProcessNode';
const {KEY_ESCAPE} = KeyCode;


/**
 * The ng-boxer component.
 */
@Directive({
	selector: 'svg[ng-boxer]',
	exportAs: 'boxer'
})
export class NgBoxer extends Coach {
	
	@Input() readonly = false;
	
	@Input() delayStart = false;
	
	@property({ initial: null }) toolMode;
	
	stapleTools: Set = new Set;
	toolModes:   Set = new Set;
	
	constructor({nativeElement}: ElementRef) {
		/* initialize coach with svg element */
		super({
			root: new Canvas({ svg: $(nativeElement) })
		});
	}
	
	addStapleTools(...tools) {
		tools.forEach(::this.stapleTools.add);
	}
	
	addToolMode(label, tools, init = ()=>{}) {
		this.toolModes.add(label);
		this.p('toolMode').filter(mode => mode === label).subscribe((m) => {
			this.activateExclusiveTools([...this.stapleTools, ...tools]);
			init();
		});
	}
	
	ngOnInit() {
		
		/* standard tools */
		this.addTool(new SelectTool     )
			.addTool(new MouseCursorTool)
			.addTool(new HighlightTool  )
			.addTool(new ClickTool      )
			.addTool(new MoveTool       )
			.addTool(new ResizeTool     )
			.addTool(new RotateTool     )
			.addTool(new DeleteTool     )
			.addTool(new PanTool        )
			.addTool(new ZoomTool       )
			.addTool(new DrawTool({
				boxFactory:   LyphBox,
				edgeFactory:  ProcessChain,
				glyphFactory: ProcessNode
			}));
		
		/* setup modes */
		this.addStapleTools(SelectTool, HighlightTool, MouseCursorTool);
		if (!this.readonly) {
			this.addToolMode('Manipulate', [ClickTool, MoveTool, ResizeTool, RotateTool, PanTool, ZoomTool]);
			this.addToolMode('Delete',     [DeleteTool]);
			this.addToolMode('Draw Lyph',  [DrawTool], () => { this.drawTool.mode = DrawTool.DRAWING_BOX   });
			this.addToolMode('Draw Edge',  [DrawTool], () => { this.drawTool.mode = DrawTool.DRAWING_EDGE  });
			
			/* escape to Manipulate */
			this.toolMode = 'Manipulate';
			this.windowE('keydown')::which(KEY_ESCAPE).subscribe(() => { this.toolMode = 'Manipulate' });
		} else {
			this.activateExclusiveTools([...this.stapleTools, PanTool, ZoomTool]);
		}
		
		// this.toolMode = 'Manipulate';
		// this.windowE('keydown')::which(KEY_ESCAPE).subscribe(() => { this.toolMode = 'Manipulate' });
		
		/* start if a delay was not requested */
		if (!this.delayStart) {
			this.start();
		}
	}
	
}

/**
 *
 */
@NgModule({
	declarations: [NgBoxer],
	exports:      [NgBoxer]
})
export class NgBoxerModule {}
