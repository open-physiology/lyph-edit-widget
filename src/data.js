import d from './data.json';
import {fromPairs} from 'lodash-bound';

export const data           = d;
export const lyphDataByName = d.lyphs.map(obj => [obj.name, obj])::fromPairs();
export const lyphDataById   = d.lyphs.map(obj => [obj.id, obj])  ::fromPairs();
