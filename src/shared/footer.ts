// Generic CC BY 4.0 attribution footer shared by every server built on this
// framework — each server supplies its own package name, license holder, and
// data version/crawl date.

export interface FooterOptions {
  sourceUrl: string;
  licenseHolder: string;
  packageName: string;
  dataVersion: string;
  crawledAt: string;
}

export function ccByFooter(opts: FooterOptions): string {
  return (
    `\n\n---\n` +
    `Source: ${opts.sourceUrl} — © ${opts.licenseHolder}, licensed CC BY 4.0 ` +
    `(https://creativecommons.org/licenses/by/4.0/). Content restructured and ` +
    `adapted by ${opts.packageName} (data v${opts.dataVersion}, crawled ` +
    `${opts.crawledAt.slice(0, 10)}); unofficial extensions are always marked.`
  );
}
