import webpack from 'webpack'
import path from 'path'
import fs from 'fs'
import { VueLoaderPlugin } from 'vue-loader'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import HtmlInlineScriptPlugin from 'html-inline-script-webpack-plugin'
import TavernLiveReloadPlugin from './webpack/TavernLiveReloadPlugin.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf8'));

export default (env, argv) => {
  const isProduction = argv.mode === 'production'
  const isWatch = argv.watch === true // 检测是否是 watch 模式

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isWatch ? 'inline.js' : (isProduction ? 'XianTu.[contenthash:8].js' : 'XianTu.js'),
      clean: true,
      publicPath: './', // 使用相对路径，便于部署
    },
    devtool: isProduction ? false : (isWatch ? false : 'eval-source-map'),
    optimization: {
      splitChunks: false, // 完全禁用代码分割
      runtimeChunk: false, // 禁用运行时chunk
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      // 强制所有模块打包到主bundle
      concatenateModules: true,
    },
    performance: {
      maxAssetSize: 100000000, // 增加资源大小限制到100MB
      maxEntrypointSize: 100000000, // 增加入口点大小限制
    },
    resolve: {
      extensions: ['.ts', '.js', '.vue', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src/'),
      },
    },
    externals: [
      ({ context, request }, callback) => {
        if (!context || !request) {
          return callback();
        }

        // 检查是否是本地文件引用
        if (
          request.startsWith('.') ||
          request.startsWith('/') ||
          path.isAbsolute(request)
        ) {
          return callback();
        }

        const builtin = {
          jquery: '$',
          lodash: '_',
          toastr: 'toastr',
          vue: 'Vue',
          'vue-router': 'VueRouter',
          yaml: 'YAML',
          zod: 'z',
        };

        if (request in builtin) {
          return callback(null, 'var ' + builtin[request]);
        }

        // 对于不在 builtin 列表中的其他npm包，正常打包，不作为外部依赖处理
        return callback();
      },
    ],
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
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1 // 强制只生成一个chunk
      }),
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
        'APP_VERSION': JSON.stringify(packageJson.version)
      }),
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: false,
          minifyCSS: true,
          minifyURLs: true,
        } : false
      }),
      // watch 模式下内联 JS 到 HTML
      isWatch ? new HtmlInlineScriptPlugin({
        htmlMatchPattern: [/index\.html$/],
        scriptMatchPattern: [/inline\.js$/],
      }) : null,
      // watch 模式下删除临时 JS 文件
      isWatch ? {
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('DeleteInlineJS', (compilation) => {
            const inlineJsPath = path.join(__dirname, 'dist', 'inline.js');
            if (fs.existsSync(inlineJsPath)) {
              fs.unlinkSync(inlineJsPath);
            }
          });
        }
      } : null,
      // !isProduction && !isWatch ? new TavernLiveReloadPlugin({ port: 6620 }) : null,
    ].filter(Boolean),
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 8080,
      hot: true,
    },
  }
}
