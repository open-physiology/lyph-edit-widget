var webpack = require('webpack');
module.exports = {
	devtool: 'source-map',
	entry: {
		'test': [ 'babel-polyfill', './src/test.js' ],
		'LyphRectangle': [ './src/artefacts/LyphRectangle.js' ],
		'index': [ './src/index.js' ]
	},
	output: {
		path: './dist',
		filename: '[name].js',
		library: 'OpenPhysiologyModel',
		libraryTarget: 'umd',
		sourceMapFilename: '[file].map'
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				exclude: /node\_modules/,
				loader: 'babel'
			},
			{
				test: /\.json$/,
				loader: 'json'
			},
			{
				test: require.resolve("snapsvg"),
				loader: "imports?this=>window"
			},
			{
				test: /\.css$/,
				loader: 'style!css!autoprefixer'
			},
		]
	},
	plugins: [
		new webpack.optimize.OccurenceOrderPlugin()
	]
};
