import {
	values,
	parseInt,
	cloneDeep,
	assign,
	uniq
} from 'lodash-bound';
import {uniqueId as _uniqueId} from 'lodash';
import assert from 'power-assert';


import manifestFactory from 'open-physiology-manifest';
const entityClasses = manifestFactory().classes;


/* super-simple storage implementation */
export const simpleBackend = () => {
	/* storage of all entities by a simple object, mapped by id */
	const storageById = {};

	/* convenience functions for setting relationship fields */
	function relationshipFieldAdd(obj, key, value) {
		let tmpEntity = entityClasses[obj.class].new();
		if (tmpEntity.fields[key].constructor.name === 'Rel1Field') {
			obj[key] = value;
		} else if (tmpEntity.fields[key].constructor.name === 'Rel$Field') {
			if (!obj[key]) { obj[key] = [] }
			let i = obj[key].findIndex((o) => o.id === value.id);
			if (i === -1) { obj[key].push(value) }
		}
	}
	function relationshipFieldRemove(obj, key, value) {
		let tmpEntity = entityClasses[obj.class].new();
		if (tmpEntity.fields[key].constructor.name === 'Rel1Field') {
			assert(obj[key] === value);
			obj[key] = null;
		} else if (tmpEntity.fields[key].constructor.name === 'Rel$Field') {
			if (!obj[key]) { obj[key] = [] }
			let i = obj[key].findIndex((o) => o.id === value.id);
			if (i >= 0) { obj[key].splice(i, 1) }
		}
	}
	
	/* the storage object exposes CRUD operations to the simple storage */
	/* and the backend interface (implementing commit & load)          */
	const storage = {
		
		create(values) {
			let id = values.id;
			while (!id || storageById[id]) { id = _uniqueId()::parseInt() }
			return storageById[id] = { ...values, id };
		},
		
		read(address) {
			return storageById[address.id];
		},
		
		readAll() {
			return storageById::values();
		},
		
		update(address, newValues) {
			return storageById[address.id]::assign(newValues);
		},
		
		delete(address) {
			delete storageById[address.id];
		}
		
	};
	
	/* the interface to hand to the library when instantiating a module */
	const backend = {
		async commit_new(values) {
			// console.log('COMMIT NEW:', values);
			return storage.create(values)::cloneDeep();
		},
		async commit_edit(address, newValues) {
			// console.log('COMMIT EDIT:', address, newValues);
			return storage.update(address, newValues)::cloneDeep();
		},
		async commit_delete(address) {
			// console.log('COMMIT DELETE:', address);
			storage.delete(address);
		},
		async commit_link(address1, key, address2) {
			// console.log('COMMIT LINK:', address1, key, address2);
			const rKey = key.replace(/^(-->|<--)/, m => m[0] === '<' ? '-->' : '<--');
			let storage1 = storage.read(address1);
			let storage2 = storage.read(address2);
			relationshipFieldAdd(storage1,  key, address2);
			relationshipFieldAdd(storage2, rKey, address1);
		},
		async commit_unlink(address1, key, address2) {
			// console.log('COMMIT UNLINK:', address1, key, address2);
			const rKey = key.replace(/^(-->|<--)/, m => m[0] === '<' ? '-->' : '<--');
			let storage1 = storage.read(address1);
			let storage2 = storage.read(address2);
			relationshipFieldRemove(storage1,  key, address2);
			relationshipFieldRemove(storage2, rKey, address1);
		},
		async load(addresses) {
			return addresses.map(addr => storage.read(addr)::cloneDeep());
		},
		async loadAll({class: cls}) {
			return storage.readAll()
				.filter(e => entityClasses[cls].hasSubclass(entityClasses[e.class]))
				::cloneDeep();
		}
	};
	
	return { storage, backend };
};
