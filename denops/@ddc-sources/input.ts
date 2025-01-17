import {
  BaseSource,
  Context,
  DdcOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddc_vim@v4.0.4/types.ts";
import { GetCompletePositionArguments } from "https://deno.land/x/ddc_vim@v4.0.4/base/source.ts";
import { Denops, fn } from "https://deno.land/x/ddc_vim@v4.0.4/deps.ts";

type Params = Record<string, never>;

export class Source extends BaseSource<Params> {
  override async getCompletePosition(
    args: GetCompletePositionArguments<Params>,
  ): Promise<number> {
    const cmdType = await fn.getcmdtype(args.denops);
    if (cmdType != "=" && cmdType != "@") {
      // No completion
      return Promise.resolve(-1);
    }

    // From head
    return Promise.resolve(0);
  }

  override async gather(args: {
    denops: Denops;
    context: Context;
    options: DdcOptions;
    sourceOptions: SourceOptions;
    completeStr: string;
  }): Promise<Item[]> {
    // Get completion type
    const mode = await fn.getcmdtype(args.denops);
    const completionType = (await fn.exists(args.denops, "*getcmdcompltype"))
      ? (await args.denops.call("getcmdcompltype") as string)
      : "";
    if (mode == "@" && completionType == "") {
      // No completion
      return [];
    }

    let results: string[] = [];

    try {
      results = await fn.getcompletion(
        args.denops,
        args.context.input,
        mode == "=" ? "expression" : completionType,
      ) as string[];
    } catch (_) {
      // Ignore errors
      //console.log(_);
    }
    if (results.length == 0) {
      return [];
    }

    let prefix = results[0].toLowerCase();
    results.forEach((word) => {
      while (!word.toLowerCase().startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
      }
    });

    const input = args.context.input.toLowerCase();
    while (!input.endsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix != "" && prefix != args.completeStr) {
      prefix = prefix.substring(args.completeStr.length);
      results = results.map((word) => word.substring(prefix.length));
    }
    return results.map(
      (
        word,
      ) => (word.endsWith("/")
        ? { word: word.slice(0, -1), abbr: word }
        : { word }),
    );
  }

  override params(): Params {
    return {};
  }
}
