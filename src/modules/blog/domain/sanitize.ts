const allowedTags = new Set(["p", "h2", "h3", "strong", "em", "ul", "ol", "li", "a", "br"]);

export function sanitizeBlogHtml(input: string) {
  let html = input.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?(script|style|iframe|object|embed|form|svg|math)[^>]*>/gi, "");
  html = html.replace(/<([a-z0-9]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    if (!allowedTags.has(name)) return "";
    if (name === "br") return "<br>";
    if (name !== "a") return `<${name}>`;
    const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    if (!/^(https?:\/\/|mailto:|\/)/i.test(href) || /javascript:/i.test(href)) return "<a>";
    const escaped = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    return `<a href="${escaped}" rel="noopener noreferrer nofollow">`;
  });
  html = html.replace(/<\/([a-z0-9]+)>/gi, (full, tag: string) => allowedTags.has(tag.toLowerCase()) && tag.toLowerCase() !== "br" ? `</${tag.toLowerCase()}>` : "");
  return html;
}
