import dynamic from "next/dynamic";

const LazyMarkdown = dynamic(() =>
  import("react-markdown").then((mod) => {
    const Markdown = mod.default;
    return import("remark-breaks").then((remarkMod) => {
      const remarkBreaks = remarkMod.default;
      return {
        default: (props: any) => (
          <Markdown {...props} remarkPlugins={[remarkBreaks]} />
        ),
      };
    });
  }),
);

export default LazyMarkdown;
