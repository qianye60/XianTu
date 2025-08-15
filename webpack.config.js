const webpack = require('webpack')
const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlInlineCssWebpackPlugin = require('html-inline-css-webpack-plugin').default
const TavernLiveReloadPlugin = require('./webpack/TavernLiveReloadPlugin')

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production'

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
      publicPath: '/',  // 添加publicPath配置
    },
    devtool: isProduction ? false : 'eval-source-map',
    resolve: {
      extensions: ['.ts', '.js', '.vue', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src/'),
      },
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
            transpileOnly: true, // Skip type checking for faster builds
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new MiniCssExtractPlugin(),
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
      }),
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
      }),
      new HtmlInlineScriptPlugin(),
      new HtmlInlineCssWebpackPlugin(),
      !isProduction ? new TavernLiveReloadPlugin() : null,
    ].filter(Boolean),
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 8080,
      hot: true,
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:8001',
          changeOrigin: true,
        },
      ],
    },
  }
}
