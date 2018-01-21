import { Compiler, Stats } from 'webpack';
import { stronglyConnectedComponents, AdjacencyList } from 'graphutil';

interface Module {
  id: string;
  name: string;
  reasons: Array<{ moduleId: string; moduleName: string }>;
}

const NODE_MODULES = /node_modules/gi;

export interface DependencyCyclePluginOptions {
  includeNodeModules?: boolean;
}

export class DependencyCyclePlugin {
  constructor(private options: DependencyCyclePluginOptions = {}) {}

  public apply(compiler: Compiler) {
    compiler.plugin('emit', (compilation, done) => {
      const includeNodeModules = this.options.includeNodeModules;
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

        return done(`Found dependency cycles...`);
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

        console.error(`Found a cycle:\n${cycleString}`);
      }
    });
  }
}
