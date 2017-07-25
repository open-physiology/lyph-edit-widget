import $                                       from '../libs/jquery.js';
import {assign, merge, cloneDeep, isUndefined} from 'lodash-bound';
import {Observable}                            from '../libs/expect-rxjs.js';

import {property} from 'utilities';

import {SvgArtefact, Edge} from 'boxer';


/**
 *
 */
export class ProcessChain extends SvgArtefact {
	
	@property() model;
	
	@property() glyph1;
	@property() glyph2;
	
	@property() type;
	
	// TODO: This was supposed to be able to handle multiple sequential
	//     : glyphs and edge segments, but currently doesn't.
	@property({ initial: [] }) intermediateGlyphs;
	@property({ initial: [] }) edges;
	
	
	constructor(options = {}) {
		super({
			...options,
			css: (options.css)::cloneDeep()::merge({
				'&': { 'fill': 'white', 'stroke': 'black' }
			})
		});
		if (options.model) { this.model = options.model }
		
		/* when the model is deleted, this artefact is deleted */
		this.p('model.deleted').filter(v=>!!v).subscribe( this.p('deleted') );
		this.p('deleted').filter(v=>!!v).subscribe(() => { this.model.delete() });
	}
	
	registerContext({artefactsById, root}) {
		/* glyph (essentially: parent) synchronization */
		for (let key of ['glyph1', 'glyph2']) {
			this.p([key, 'model'])
			    .filter(([g,m]) => !g::isUndefined() && !!m)
			    .subscribe(([glyphArtefact, model]) => {
					model[key] = glyphArtefact && glyphArtefact.model;
				});
			this.p(`model.${key}`)
			    .filter(p => !p::isUndefined())
				.map(p => p && artefactsById[p.id])
				.subscribe( this.p(key) );
		}
	}
	
	
	_createEdge() {
		const result = new Edge({
			glyph1: this.glyph1,
			glyph2: this.glyph2
		});
		result.handlers.deletable::assign({
			artefact: this
		});
		return result;
	}
	
	create(options = {}) {
		super.create(options);
		
		/* initialize glyphs */
		for (let g of [1, 2]) {
			this[`glyph${g}`] = options[`glyph${g}`];
		}
		
		/* initial edge */
		this.edges = [this._createEdge()];
		
	}
	
	postCreate(options = {}) {
		super.postCreate(options);
		
		/* set standard handlers */
		this.p('edges').subscribe((edges) => {
			let elements = $();
			for (let edge of edges) {
				elements = elements.add(edge.svg.overlay);
			}
			for (let edge of edges) {
				edge.handlers.deletable::assign({
					artefact: this
				});
				edge.handlers.highlightable::assign({
					artefact: this,
					effect: { elements }
				});
			}
			this.handlers.highlightable = { // TODO: had to use =, because it was never assigned in the first place
				artefact: this,
				effect: { elements }
			};
		});
		
		// /* reassign handlers */
		// // assign particular responsibilities between inner artefacts and the main ProcessChain
		// this.p(['intermediateGlyphs', 'edges']).subscribe(([glyph1, glyph2, iGlyphs, edges]) => {
		// 	for (let key of ['deletable', 'highlightable']) for (let thing of [...edges, ...iGlyphs]) {
		// 		thing.handlers[key]::assign(this.handlers[key]);
		// 	}
		// });
		
		/* when this ProcessChain is deleted, delete all its edges */
		this.p('deleted').filter(d=>!!d).subscribe(() => {
			for (let edge  of this.edges)              { edge .delete() }
			for (let glyph of this.intermediateGlyphs) { glyph.delete() }
		});
		
		/* delete this when either glyph is deleted */
		Observable.merge(
			this.p('glyph1.deleted').filter(d=>!!d),
			this.p('glyph2.deleted').filter(d=>!!d)
		).take(1).subscribe( this.p('deleted') );
		
		
		/* sync type with glyphs */
		Observable.combineLatest(
			this.p('model'),
			Observable.merge(
				this.p('glyph1.model.type'),
				this.p('glyph2.model.type')
			).filter(t => t !== '')
		).filter(([m]) => !!m).subscribe(([model, type]) => {
			model.type = type;
		});
		
		
		Observable.combineLatest(
			this.p('glyph1'),
			this.p('glyph2'),
			this.p('model.type').filter(t => t !== '')
		).filter(([g1, g2]) => !!g1 && !!g2).subscribe(([glyph1, glyph2, type]) => {
			glyph1.model.type = type;
			glyph2.model.type = type;
		});
		
		
		/* set glyph handlers */
		const handlers = {
			movable: {
				before: () => { this.handlesActive = false },
				after:  () => { this.handlesActive = true  }
			}
		};
		this.p('glyph1').filter(g=>!!g).subscribe((glyph1) => { glyph1.registerHandlers(handlers) });
		this.p('glyph2').filter(g=>!!g).subscribe((glyph2) => { glyph2.registerHandlers(handlers) });
		// TODO: same for intermediate glyphs, dynamically
		
		/* propagate 'handlesActive' */
		this.p('handlesActive').subscribe((ha) => {
			for (let artefact of [
				...this.edges,
				...this.intermediateGlyphs,
				this.glyph1,
				this.glyph2
			]) { artefact.handlesActive = ha }
		});
		
		/* manifest color */
		this.p('model.color').subscribe((color) => {
			for (let artefact of [...this.edges, ...this.intermediateGlyphs]) {
				artefact.setCSS({ '&': { stroke: color, fill: color } });
			}
		});
		
	}
	
}
