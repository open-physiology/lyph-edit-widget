import chroma         from 'chroma-js';
import {getHsvGolden} from 'golden-colors';

Object.assign(chroma, {

	randomHsvGolden(saturation, value) {
		return chroma.rgb(...getHsvGolden(saturation, value).toRgb());
	}

});

export default chroma;
