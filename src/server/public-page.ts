export function serializePageData(data: unknown): string {
  // JSON lives in a script element: a track title must never close that element.
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

export function pageHtml(template: string, markup: string, data: unknown): string {
  return template.replace('<div id="root"></div>', () =>
    `<div id="root">${markup}</div><script id="public-page-data" type="application/json">${serializePageData(data)}</script>`,
  );
}
