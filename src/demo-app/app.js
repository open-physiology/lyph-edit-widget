import {NgModule, Component, Input, ElementRef, ViewChild} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {PerfectScrollbarModule} from 'angular2-perfect-scrollbar';
import assert from 'power-assert';
import FileSaver from 'file-saver';

import $ from '../libs/jquery.js';
import Rx from '../libs/provide-rxjs.js';
const {Observable} = Rx;
import {pull, values, pick, assign, isUndefined} from 'lodash-bound';

import {NgBoxerModule, NgBoxer} from '../NgBoxer.js';

import {Model} from '../models/Model.js';
import {match, property, ValueTracker} from 'utilities';
import {LyphModel} from '../models/LyphModel';
import {ProcessModel} from '../models/ProcessModel';
import {LyphBox} from '../artefacts/LyphBox';
import {LyphInfoPanelModule} from '../artefacts/LyphInfoPanel';
import {ProcessInfoPanelModule} from '../artefacts/ProcessInfoPanel';
import {ProcessNode} from '../artefacts/ProcessNode';
import {ProcessChain} from '../artefacts/ProcessChain';
import {ProcessNodeModel} from '../models/ProcessNodeModel';
import {UniversalInfoPanelModule} from '../artefacts/UniversalInfoPanel';

import  manifestFactory      from 'open-physiology-manifest';
import {Module, ajaxBackend} from 'open-physiology-model';
import {simpleBackend}       from './simple-backend.js';


const SERVER_URL = 'http://localhost:8888';


/**
 * The demo application.
 */
@Component({
	selector: 'body',
	styles: [`

		:host {
			padding:  0;
			margin:   0;
			width:  100%;
			height: 100%;
		}
		
		svg {
			padding:  0;
			margin:   0;
			position: absolute;
			top:      0;
			left:     0;
			width:    calc(100% - 202px);
			height:   100%;
		}
		
		div.button-section {
			position: fixed;
			top: 0;
			right: 0;
			margin: 0;
			padding: 2px;
			width: 202px;
			height: 100px;
			border: solid 1px black;
			z-index: 10;
			background-color: white;
			display: flex;
			flex-wrap: wrap; 
			justify-content: space-between;
			align-content: stretch;
		}
		
		div.button-section > button {
			border: solid 1px gray;
			margin: 2px;
			outline: none;
			cursor: pointer;
			background-color: transparent;
			flex-basis: 90px;
			flex-grow: 1;
		}
		
		div.button-section > button.full-width {
			flex-basis: 180px;
		}
		
		div.button-section > button:hover {
			border-color: black;
			background-color: #eee;
		}
		
		div.button-section > button.selected {
			border-color: black;
			background-color: #aff;
		}
		
		div.right-panel-bottom {
			position: fixed;
			bottom: 0;
			right: 0;
			margin: 0;
			padding: 0;
			width: 202px;
			border: solid 1px black;
			z-index: 10;
			pointer-events: none;
		}
		
		perfect-scrollbar.right-panel {
			margin: 0;
			padding: 0;
			position: absolute;
			top: 100px;
			right: 0;
			height: calc(100% - 100px);
			width:  202px;
			/*overflow-y: auto;*/
		}
		
		perfect-scrollbar.right-panel.color-picker-open {
			width: 100%;
		}
		
		div.right-panel-inner {
			position: absolute;
			top: 0;
			right: 0;
			margin: 0;
			padding: 0;
			width:  202px;
			border: 1px black;
			border-style: none solid;
			overflow: visible;
			background-color: white;
			min-height: 100%;
		}
		
		div.right-panel-inner > .model-section {
			width: 100%;
			padding-bottom: 5px;
			overflow: visible;
		}
		
		div.right-panel-inner > .model-section.animating {
			overflow: hidden;
		}
		
		div.right-panel-inner > .model-section > h2 {
			margin: 16px 0 6px 0;
			padding: 0 0 0 9px;
			font-family: sans-serif;
			font-size: 18px;
			border-bottom: solid 1px black;
		}
		
		div.right-panel-inner > .model-section > h2 > div {
			margin-bottom: -4px;
		}
		
		div.right-panel-inner > .model-section > .info-panel {
			margin: 2px 4px 0 4px;
		}
		
		div.right-panel-inner > .model-section > .info-panel.visible {
		    animation: slide-in 0.3s both;
		}
		
		div.right-panel-inner > .model-section > .info-panel:not(.visible) {
		    animation: slide-out 0.3s both;
		}
		
		@keyframes slide-in {
			  0% { transform: translateX(200px) }
			100% { transform: translateX(0)     }
		}
		
		@keyframes slide-out {
			  0% { transform: translateX(0)     }
			100% { transform: translateX(200px) }
		}
		
		
`],
	template: `
		
		<div><svg ng-boxer [delayStart]="true" [readonly]="readonly" #boxer=boxer></svg></div>
		
		<div class="button-section">
			<button
				[class]                 = " 'full-width' "
		        [style.font-weight]     = " 'bold'       "
		        [disabled]              = " committing   "
		        (click)                 = " commit()     "> Commit Model </button
	        ><input #fileInput
				[type]          = " 'file'                     "
				[accept]        = " '.json'                    "
				[style.display] = " 'none'                     "
				(change)        = " loadFiles(fileInput.files) "
			/><button
		        [style.font-weight]     = " 'bold'                          "
		        [disabled]              = " committing                      "
		        (click)                 = " fileInput.click()               "> Load View </button
	        ><button
	        	*ngIf                   = " !readonly                       "
		        [style.font-weight]     = " 'bold'                          "
		        [disabled]              = " committing                      "
		        (click)                 = " save()                          "> Save View </button
	        ><button
	            *ngFor                  = " let toolMode of boxer.toolModes "
			    [class.selected]        = " boxer.toolMode === toolMode     "
		        [disabled]              = " committing                      "
			    (click)                 = " boxer.toolMode =   toolMode     ">{{ toolMode }}</button
	    ></div>
		<perfect-scrollbar class="right-panel"
			[class.color-picker-open]="colorPickerOpen"
			(mouseenter)=" mouseOverRightPanel = true  "
			(mouseleave)=" mouseOverRightPanel = false "
		>
		
			<div class="right-panel-inner">
				
				<div *ngIf="lyphModels.length"
				     [class.model-section] = " true               "
				     [class.animating]     = " animationCount > 0 ">
					<h2 #lyphsHeader><div>Lyphs</div></h2>
					<lyph-info-panel
						*ngFor            = " let model of lyphModels              "
						[readonly]        = " readonly                             "
						(init)            = " lyphsHeader.scrollIntoViewIfNeeded() "
						[model]           = " model                                "
						[class.info-panel]= " true                                 "
						[class.visible]   = " !model.deleted                       "
						(colorPickerOpen) = " colorPickerOpen = $event             "
						[modelsById]      = " modelsById "
					></lyph-info-panel>
				</div>
				
				<div *ngIf="processModels.length"
				     [class.model-section] = " true               "
				     [class.animating]     = " animationCount > 0 ">
					<h2 #processesHeader><div>Processes</div></h2>
					<process-info-panel
					    *ngFor            = " let model of processModels               "
						[readonly]        = " readonly                                 "
						(init)            = " processesHeader.scrollIntoViewIfNeeded() "
						[model]           = " model                                    "
						[class.info-panel]= " true                                     "
						[class.visible]   = " !model.deleted                           "
						(colorPickerOpen) = " colorPickerOpen = $event                 "
						[modelsById]      = " modelsById "
					></process-info-panel>
				</div>
				
			</div>
			
		</perfect-scrollbar>
			
		<div class="right-panel-bottom"
			*ngIf                    = " selectedModel && !mouseOverRightPanel "
			[style.background-color] = " selectedModel.color                   "
		>
			<universal-info-panel
				[model]    = " selectedModel "
				[readonly] = " true          "
			></universal-info-panel>
		</div>
	    
	`
})
export class DemoApp extends ValueTracker {
	
	module; // open-physiology-model
	
	@ViewChild('boxer') boxer: NgBoxer;
	
	@ViewChild('processesHeader') processesHeader;
	
	@Input() readonly = false;
	
	lyphModels:    Array<Model> = [];
	nodeModels:    Array<Model> = [];
	processModels: Array<Model> = [];
	
	artefactsById = {};
	modelsById    = {};
	opModelsById  = {};
	
	animationCount: number = 0;
	colorPickerOpen     = false;
	mouseOverRightPanel = false;
	committing          = false;
	
	@property({ initial: null }) selectedModel;
	
	constructor({nativeElement}: ElementRef) {
		super();
		this.nativeElement = $(nativeElement);
		
		/* fetching [readonly] from body element; @Input doesn't actually work on root components */
		let readOnlyAttr = this.nativeElement.attr('[readonly]');
		this.readonly = readOnlyAttr ? JSON.parse(readOnlyAttr) : false;
		
		/* initializing open-physiology-model module */
		let {backend} = ajaxBackend({ baseURL: SERVER_URL, ajax: ::$.ajax });
		this.module = new Module({
			manifest: manifestFactory(),
			backend:  backend
		});
	}
	
	ngAfterViewInit() {
		/* react to artefact creation */
		// TODO: the .e() version of this caused errors. Why??
		this.boxer.drawTool.p('artefactCreated')
		    .filter(v=>!!v)
		    .subscribe(::this.onArtefactCreated);
		
		/* register events we'll use */
		this.boxer.registerArtefactEvent('mouseenter', 'mouseleave');
		
		/* highlighting */
		this.boxer.highlightTool.register(this.boxer.highlightTool, this.boxer.stateMachine.p('state').switchMap(state => match(state)({
			'IDLE': this.p('selectedModel').map((model) => model ? this.artefactsById[model.id] : null),
			'BUSY': Observable.of(null)
		})).map(artefact => artefact && {
			...this.boxer.highlightTool.HIGHLIGHT_DEFAULT,
			artefact
		}));
		
		this.boxer.start();
	}
	
	async commit() {
		this.committing = true;
		let result = await this.module.commit();
		this.committing = false;
		return result;
	}
	
	save() {
		let result = JSON.stringify({
			lyphs:     this.lyphModels,
			nodes:     this.nodeModels,
			processes: this.processModels
		}, null, 4);
		const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
		FileSaver.saveAs(blob, 'apinatomy-model.json');
	}
	
	loadFiles(files) {
		const reader = new FileReader();
        reader.onload = () => { this.load(JSON.parse(reader.result)) };
		reader.readAsText(files[0]);
	}
	
	load(json) {
		/* convenient map of mode classes by name */
		const modelClasses = {
			LyphModel,
			ProcessNodeModel,
			ProcessModel
		};
		
		
		const idsSeen = new Set;
		
		/* create a map from model id to corresponding json object */
		const jsonById = {};
		for (let [cls, key] of [
			[LyphModel,        'lyphs'    ],
			[ProcessNodeModel, 'nodes'    ],
			[ProcessModel,     'processes']
		]) for (let jsn of json[key]) {
			if (idsSeen.has(jsn.id)) {
				console.warn('duplicate id:', jsn.id);
			}
			idsSeen.add(jsn.id);
			jsonById[jsn.id] = jsn;
		}
		
		/* how to create a new model (it is called recursively to create prerequisites first) */
		const createModel = (jsn) => {
			if (!this.modelsById[jsn.id]) {
				const cls = modelClasses[jsn.class];
				
				/* do parents or connected glyphs first */
				if (jsn.parent) { createModel(jsonById[jsn.parent]) }
				if (jsn.glyph1) { createModel(jsonById[jsn.glyph1]) }
				if (jsn.glyph2) { createModel(jsonById[jsn.glyph2]) }
				
				/* then create this model */
				const model = cls.fromJSON(jsn, {modelClasses, modelsById: this.modelsById});
				this.modelsById[model.id] = model;
				
				/* and register it */
				this.onModelCreated(model);
			}
		};
		
		
		/* kick off model creation */
		for (let jsn of jsonById::values()) {
			createModel(jsn);
		}
	}
	
	onArtefactCreated(newArtefact) {
		
		const isLyph    = newArtefact instanceof LyphBox;
		const isGlyph   = newArtefact instanceof ProcessNode;
		const isProcess = newArtefact instanceof ProcessChain;
		
		/* create model */
		const modelClass = isLyph ? LyphModel : isGlyph ? ProcessNodeModel : ProcessModel;
		const newModel = new modelClass({ modelsById: this.modelsById });
		
		/* register both into the system */
		this.registerModelArtefactPair(newModel, newArtefact);
	}
	
	onModelCreated(newModel) {
		
		const isLyph    = newModel instanceof LyphModel;
		const isGlyph   = newModel instanceof ProcessNodeModel;
		const isProcess = newModel instanceof ProcessModel;
		
		/* create artefact */
		const artefactClass = isLyph ? LyphBox : isGlyph ? ProcessNode : ProcessChain;
		// let newArtefact = new artefactClass();
		
		
		const newArtefactOptions = {
			model: newModel,
			css: { '&': { 'fill': 'white', 'stroke': 'black' } }
		};
		if (isProcess) {
			newArtefactOptions::assign({
				glyph1: this.artefactsById[newModel.glyph1.id],
				glyph2: this.artefactsById[newModel.glyph2.id]
			});
		} else {
			newArtefactOptions::assign({
				parent: newModel.parent && this.artefactsById[newModel.parent.id]
			});
		}
		
		const newArtefact = new artefactClass(newArtefactOptions);
		
		/* register both into the system */
		this.registerModelArtefactPair(newModel, newArtefact);
	}
	
	registerModelArtefactPair(newModel, newArtefact) {
		
		const isLyph    = newModel instanceof LyphModel;
		const isGlyph   = newModel instanceof ProcessNodeModel;
		const isProcess = newModel instanceof ProcessModel;
		
		newArtefact.model = newModel;
		this.artefactsById[newModel.id] = newArtefact;
		newArtefact.registerContext({
			artefactsById: this.artefactsById,
			root:          this.boxer.root
		});
		newModel.p('deleted').filter(d=>!!d).subscribe(() => {
			delete this.artefactsById[newModel.id];
		});
		
		/* register + delete handling */
		const models = isLyph ? this.lyphModels : isGlyph ? this.nodeModels : this.processModels;
		Observable.of(null)
			.do(() => { this.animationCount += 1 })
			.do(() => { models.unshift(newModel) })
			.delay(301) // wait for the slide-out animation
			.do(() => { this.animationCount -= 1 })
			.subscribe(()=>{});
		newModel.p('deleted')
			.filter(d=>!!d)
			.do(() => { this.animationCount += 1 })
			.delay(301) // wait for the slide-out animation
			.do(() => { this.animationCount -= 1 })
			.subscribe(() => { models::pull(newModel) });
		
		/* selecting */
		// newModel.p('selected').filter(s => !!s)
		//         .map(() => newArtefact)
		//         .subscribe(::this.boxer.setSelectedArtefact);
		newModel.p('selected').withLatestFrom(this.p('selectedModel')).subscribe(([selected, current]) => {
			if (selected) {
				this.selectedModel = newModel;
			} else if (current === newModel) {
				this.selectedModel = null;
			}
		});
		this.p('selectedModel')
		    .map(m => m === newModel)
		    .subscribe(newModel.p('selected'));
		
		this.boxer.p('selectedArtefact')
		    .map(a => !!a && !!a.handlers && !!a.handlers.highlightable
		           && a.handlers.highlightable.artefact === newArtefact)
		    .subscribe(newModel.p('selected'));
		
		/* registering layers created by this model */
		newModel.p('createdLayer').filter(m=>!!m).subscribe((layerModel) => {
			this.onModelCreated(layerModel);
		});
		
		/* create and maintain open-physiology-model model */
		let opModel = this.opModelsById[newModel.id] = this.module.new({
			class: isLyph    ? 'Lyph'
			     : isProcess ? 'Process'
			                 : 'Node',
			// TODO: borders (and sometimes axis) + sync open/closed
		});
		opModel._boxModel = newModel;
		newModel.p('deleted').subscribe( opModel.p('deleted') );
		newModel.p('name').subscribe( opModel.fields['name'].p('value') );
		switch (true) {
			case isLyph: {
				
				/* borders */
				let longitudinalBorders = [
					this.module.new({ class: 'Border', nature: [] }),
					this.module.new({ class: 'Border', nature: [] })
				];
				let radialBorders = [
					this.module.new({ class: 'Border' }),
					this.module.new({ class: 'Border' })
				];
				newModel.p('hasAxis').subscribe((hasAxis) => {
					if (hasAxis) {
						opModel.axis = longitudinalBorders[0];
						longitudinalBorders[0].nature = ['open'];
					} else {
						opModel.axis = null;
						opModel.longitudinalBorders.add(longitudinalBorders[0]);
						longitudinalBorders[0].nature = [];
					}
				});
				opModel.longitudinalBorders.add(longitudinalBorders[1]);
				opModel.radialBorders.add(radialBorders[0]);
				opModel.radialBorders.add(radialBorders[1]);
				
				/* delete borders when lyph is deleted */
				newModel.p('deleted').subscribe((deleted) => {
					longitudinalBorders[0].p('deleted').next(deleted);
					longitudinalBorders[1].p('deleted').next(deleted);
					radialBorders[0].p('deleted').next(deleted);
					radialBorders[1].p('deleted').next(deleted);
				});
				
				/* open/closed */
				newModel.p('leftSideClosed').subscribe((closed) => {
					radialBorders[0].nature = closed ? ['closed'] : ['open'];
				});
				newModel.p('rightSideClosed').subscribe((closed) => {
					radialBorders[1].nature = closed ? ['closed'] : ['open'];
				});
				
				/* length, thickness */
				for (let key of ['length', 'thickness']) {
					newModel.p([`${key}Specified`, `${key}Min`, `${key}Max`])
				        .subscribe(([specified, min, max]) => {
							if (!specified) { [min, max] = [0, 9] }
					        opModel[key] = {
								min: parseInt(min, 10),
						        max: parseInt(max, 10),
						        class: 'NumberRange'
							};
						});
				}
				
				/* parent */
				newModel.p('parent')
			        .map(p => p && this.opModelsById[p.id])
			        .subscribe((opParent) => {
				        opModel.fields['<--HasPart'].set(opParent ? [opParent] : [])
			        });
				
				/* layer-ness */
				newModel.p(['layerNr'], ['parent']).subscribe(([layerNr, parent]) => {
					if (!parent) { return }
					const opParent = this.opModelsById[parent.id];
					if (typeof layerNr !== 'number') {
						opModel.fields['<--HasPart'].set([opParent]);
					} else {
						opModel.fields['<--HasLayer'].set([opParent]);
						let layerCount = opParent.layers.size;
						let layers = new Array(layerCount);
						for (let opLayer of opParent.layers) {
							const layer = opLayer._boxModel;
							if (layer.layerNr >= layerCount || layers[layer.layerNr]) { return }
							layers[layer.layerNr] = opLayer;
						}
						layers[0].fields['<--IsRadiallyAdjacent'].set([]);
						for (let i = 1; i < layers.length; ++i) {
							layers[i].fields['<--IsRadiallyAdjacent'].add(layers[i-1]);
						}
						layers[layers.length-1].fields['-->IsRadiallyAdjacent'].set([]);
					}
		        });
				
			} break;
			case isGlyph: {
				
				/* parent */
				newModel.p('parent')
			        .map(p => p && this.opModelsById[p.id])
		            .subscribe((opParent) => {
                        opModel.fields['<--ContainsNode'].set(opParent ? [opParent] : [])
                    });
				
			} break;
			case isProcess: {
				
				/* glyphs */
				newModel.p('glyph1')
			        .map(p => p && this.opModelsById[p.id])
		            .subscribe((glyph) => {
			            glyph.fields['-->IsSourceFor'].add(opModel);
                    });
				newModel.p('glyph2')
			        .map(p => p && this.opModelsById[p.id])
		            .subscribe((glyph) => {
			            opModel.fields['-->HasTarget'].set(glyph);
                    });
				
			} break;
		}
		
		// /* feature: hover over tile to reveal neural edges */
		// if (isGlyph) {
		// 	newArtefact.newProperty('revealed');
		// 	newArtefact.p(['revealed', 'model.type']).subscribe(([r, type]) => {
		// 		newArtefact.svg.main.css('visibility', (type !== 'cytosol' || r)
		// 			? 'visible'
		// 			: 'hidden'
		// 		);
		// 	});
		// 	newModel.p('internal').switchMap(int => int
		// 		? Observable.never()
		// 		: newArtefact.p('parent.parent.model.selected')
		// 	).subscribe( newArtefact.p('revealed') );
		// }
		// if (isProcess) {
		// 	newArtefact.newProperty('revealed');
		// 	newArtefact.p(['revealed', 'model.type']).subscribe(([r, type]) => {
		// 		for (let edge of newArtefact.edges || []) {
		// 			edge.svg.main.css('visibility', (type !== 'cytosol' || r)
		// 				? 'visible'
		// 				: 'hidden'
		// 			);
		// 		}
		// 		newArtefact.glyph1.svg.main.css('visibility', (type !== 'cytosol' || r)
		// 			? 'visible'
		// 			: 'hidden'
		// 		);
		// 		newArtefact.glyph2.svg.main.css('visibility', (type !== 'cytosol' || r)
		// 			? 'visible'
		// 			: 'hidden'
		// 		);
		// 	});
		// 	Observable.merge(
		// 		newArtefact.p('glyph1.revealed'),
		// 		newArtefact.p('glyph2.revealed'),
		// 		newArtefact.p('revealed')
		// 	).subscribe((r) => {
		// 		if (newArtefact.glyph1.model.internal) {
		// 			newArtefact.glyph1.p('revealed').next(r);
		// 		}
		// 		if (newArtefact.glyph2.model.internal) {
		// 			newArtefact.glyph2.p('revealed').next(r);
		// 		}
		// 		newArtefact.p('revealed').next(r);
		// 	});
		// }
		
		
	}
	
}

/**
 * The lyph editor demo application.
 */
@NgModule({
	imports: [
		BrowserModule,
		NgBoxerModule,
		LyphInfoPanelModule,
		ProcessInfoPanelModule,
		UniversalInfoPanelModule,
		PerfectScrollbarModule.forRoot({ suppressScrollX: true })
	],
	declarations: [
		DemoApp
	],
	bootstrap: [DemoApp],
})
export class DemoAppModule {}
