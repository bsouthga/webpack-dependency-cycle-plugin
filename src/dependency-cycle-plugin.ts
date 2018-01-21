import { Compiler, Stats } from 'webpack';
import { stronglyConnectedComponents, AdjacencyList } from 'graphutil';

interface Module {
  id: string;
  name: string;
  reasons: Array<{ moduleId: string; moduleName: string }>;
}

const NODE_MODULES = /node_modules/gi;

export interface DependencyCyclePluginOptions {
  /**
   * whether we should check for cycles in node modules. Defaults to false
   */
  includeNodeModules?: boolean;
  /**
   * should we emit an error on finding cycles? defaults to true
   */
  failOnError?: boolean;
}

export class DependencyCyclePlugin {
  constructor(private options: DependencyCyclePluginOptions = {}) {}

  public apply(compiler: Compiler) {
    const { includeNodeModules = false, failOnError = true } = this.options;
    compiler.plugin('emit', (compilation, done) => {
      const stats = compilation.getStats().toJson();
      const graph: AdjacencyList = {};
      const nameHash: { [key: string]: string } = {};

      stats.modules.forEach((module: Module) => {
        const name = module.name;
        nameHash[module.id] = name;

        const seen: { [key: string]: boolean } = {};
        const uniqueReasons = module.reasons.filter(reason => {
          const parent = reason.moduleId;
          if (seen['$' + parent]) {
            return false;
          }
          seen['$' + parent] = true;
          return true;
        });

        const edges = (graph[module.id] = [] as string[]);

        uniqueReasons.forEach(({ moduleId }) => {
          edges.push(moduleId.toString());
        });
      });

      const components = stronglyConnectedComponents(graph);
      const nodes = Object.keys(graph);

      if (components.length !== nodes.length) {
        components
          .filter(c => c.length > 1 && !c.some(isNodeModule))
          .forEach(logCycleMessage);

        return done();
      }

      return done();

      function isNodeModule(id: string) {
        if (includeNodeModules) {
          return false;
        }
        return NODE_MODULES.test(getNameFromHash(id));
      }

      function getNameFromHash(id: string) {
        if (!nameHash) {
          return id;
        }
        return id in nameHash ? nameHash[id] : id;
      }

      function logCycleMessage(cycle: string[]) {
        const startId = cycle[0];
        const cycleString = [...cycle, startId]
          .map(id => getNameFromHash(id))
          .join('\n  -> ');

        const message = error(`Found a cycle:\n${cycleString}`);
        if (failOnError) {
          compilation.errors.push(message);
        } else {
          compilation.warnings.push(message);
        }
      }
    });
  }
}

function error(message: string) {
  return new Error(`webpack-dependency-cycle-plugin: ${message}`);
}
