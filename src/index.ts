import type { DocgenPluginType, PluginOptions } from "./plugin";

class EmptyPlugin {
  public static defaultOptions = {
    setDisplayName: true,
    typePropName: "type",
    docgenCollectionName: "STORYBOOK_REACT_CLASSES",
  };

  constructor(_: PluginOptions = {}) {}

  apply() {}
}

let plugin: DocgenPluginType;

// It should be possible to use the plugin without TypeScript.
// In that case using it is a no-op.
try {
  require.resolve("typescript");
  plugin = require("./plugin").default;
} catch {
  plugin = EmptyPlugin as unknown as DocgenPluginType;
}

export type { PluginOptions } from "./plugin";
export { plugin as ReactDocgenTypeScriptPlugin };
export default plugin;
