var webpack = require('webpack');
module.exports = {
	devtool: 'source-map',
	entry: {
		'test': [ 'babel-polyfill', './src/test.js' ],
		'LyphRectangle': [ './src/artefacts/LyphRectangle.js' ]
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
			}
		]
	},
	plugins: [
		new webpack.optimize.OccurenceOrderPlugin()
	]
};
