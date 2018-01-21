# Webpack Dependency Cycle Plugin

[![npm version](https://badge.fury.io/js/webpack-dependency-cycle-plugin.svg)](https://badge.fury.io/js/webpack-dependency-cycle-plugin)

Check for cycles in your modules via [Tarjan's Algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm)

## Installation

```shell
npm install --save-dev webpack-dependency-cycle-plugin
```

## Usage

```typescript
import { DependencyCyclePlugin } from 'webpack-dependency-cycle-plugin';

const webpackConfig = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'index_bundle.js'
  },
  plugins: [new DependencyCyclePlugin({
    includeNodeModules: false // defaults to false
  })]
};
```
