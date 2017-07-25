import {merge, cloneDeep, isUndefined} from 'lodash-bound';

import {property} from 'utilities';

import {Glyph} from 'boxer';
import {LyphBox} from './LyphBox';


/**
 *
 */
export class ProcessNode extends Glyph {
	
	@property() model;
	
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
		
		/* other model synchronizations */
		for (let key of ['transformation']) {
			this.p(`model.${key}`).subscribe( this.p(key) );
			this.p([key, 'model']).filter(([,m]) => !!m).subscribe(([value, model]) => { model[key] = value });
		}
	}
	
	registerContext({artefactsById, root}) {
		/* parent synchronization */
		this.p(['parent', 'model'])
		    .map(([p, m]) => {
				// find the closest ancestor artefact that has a model
			    while (p && !p.model && p !== root) { p = p.parent }
			    return [p, m];
		    })
		    .filter(([p,m]) => !p::isUndefined() && !!m)
		    .subscribe(([parentArtefact, model]) => {
				model.parent = (parentArtefact && parentArtefact !== root) ? parentArtefact.model : null;
			});
		this.p(`model.parent`)
		    .filter(p => !p::isUndefined())
			.map(p => p ? artefactsById[p.id] : root)
			.map((a) => {
			    if (a instanceof LyphBox) { a = a.contentBox }
			    // ^ create more general handler/rule for using a sub-artefact as a container,
			    //   and translating back and forth between conceptual parent and artefact parent
				return a;
			})
			.subscribe( this.p('parent') );
	}
	
	postCreate(options = {}) {
		super.postCreate(options);
		
		/* toggle internal node status */
		this.e('click').subscribe(() => {
			this.model.internal = !this.model.internal;
		});
		
		/* reflect internal node status visually */
		this.p('model.internal').subscribe((internal) => {
			this.radius = internal ? 4 : 6;
			this.setCSS({
				'&': { fill: internal ? 'black' : 'white' }
			});
		});
		
	}
	
	
}
