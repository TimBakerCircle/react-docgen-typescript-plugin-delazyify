import * as docGen from "react-docgen-typescript";
import ts from "typescript";
import type { LoaderContext } from "webpack";

import {
  generateDocgenCodeBlock,
  type GeneratorOptions,
} from "./generateDocgenCodeBlock";

export type RegisteredDocgenLoaderOptions = {
  docgenOptions: docGen.ParserOptions;
  generateOptions: Pick<
    GeneratorOptions,
    "docgenCollectionName" | "setDisplayName" | "typePropName"
  >;
  compilerOptions: ts.CompilerOptions;
};

type DirectDocgenLoaderOptions = Partial<RegisteredDocgenLoaderOptions> &
  Partial<
    Pick<
      GeneratorOptions,
      "docgenCollectionName" | "setDisplayName" | "typePropName"
    >
  > &
  docGen.ParserOptions;

type DocgenLoaderOptions = DirectDocgenLoaderOptions & {
  configId?: string;
};

const defaultGenerateOptions = {
  docgenCollectionName: "STORYBOOK_REACT_CLASSES",
  setDisplayName: true,
  typePropName: "type",
} satisfies RegisteredDocgenLoaderOptions["generateOptions"];

const registeredOptions = new Map<string, RegisteredDocgenLoaderOptions>();
let nextConfigId = 0;

export function registerDocgenLoaderOptions(
  options: RegisteredDocgenLoaderOptions
): string {
  const configId = String((nextConfigId += 1));
  registeredOptions.set(configId, options);

  return configId;
}

function resolveLoaderOptions(
  options: DocgenLoaderOptions
): RegisteredDocgenLoaderOptions {
  if (options.configId) {
    const registered = registeredOptions.get(options.configId);

    if (!registered) {
      throw new Error(
        `Missing react-docgen-typescript-plugin loader options for id ${options.configId}.`
      );
    }

    return registered;
  }

  const {
    compilerOptions,
    docgenOptions,
    generateOptions,
    docgenCollectionName,
    setDisplayName,
    typePropName,
    ...topLevelDocgenOptions
  } = options;

  return {
    compilerOptions: compilerOptions || {},
    docgenOptions: {
      shouldIncludeExpression: true,
      ...topLevelDocgenOptions,
      ...docgenOptions,
    },
    generateOptions: {
      ...defaultGenerateOptions,
      ...generateOptions,
      docgenCollectionName:
        docgenCollectionName === undefined
          ? generateOptions?.docgenCollectionName ??
            defaultGenerateOptions.docgenCollectionName
          : docgenCollectionName,
      setDisplayName:
        setDisplayName ?? generateOptions?.setDisplayName ??
        defaultGenerateOptions.setDisplayName,
      typePropName:
        typePropName ?? generateOptions?.typePropName ??
        defaultGenerateOptions.typePropName,
    },
  };
}

export default function loader(
  this: LoaderContext<DocgenLoaderOptions>,
  source: string
): void {
  const callback = this.async();

  try {
    const { compilerOptions, docgenOptions, generateOptions } =
      resolveLoaderOptions(this.getOptions());
    const parser = docGen.withCompilerOptions(compilerOptions, docgenOptions);
    const program = ts.createProgram([this.resourcePath], compilerOptions);
    const componentDocs = parser.parseWithProgramProvider(
      this.resourcePath,
      () => program
    );

    if (!componentDocs.length) {
      callback(null, source);
      return;
    }

    callback(
      null,
      generateDocgenCodeBlock({
        filename: this.resourcePath,
        source,
        componentDocs,
        ...generateOptions,
      })
    );
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)));
  }
}
