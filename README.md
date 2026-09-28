# jossarmstrong.org

Static HTML/CSS scholarly website for Joss Armstrong.

The catalogue contains 22 works: 9 peer-reviewed published papers, 9 preprints (8 arXiv and 1 Zenodo), 3 SSRN working papers, and 1 published white paper. Stable IDs in `data/works.json` also identify the corresponding articles in `works/index.html`; update both files together.

TACIT and ORACLE have author companion pages at `/works/tacit/` and `/works/oracle/`, including explanations, scoped evaluation results, publication metadata and downloadable BibTeX citations. For these records, `url` remains the published-paper DOI and `page_url` identifies the companion page used by the Works title link. Update each page's citation metadata, JSON-LD and `citation.bib` together when correcting bibliographic details. Shared companion-page styles are in `css/paper.css`.

Publish the contents of this directory at the root of the public repository `jossarmstrong-research/jossarmstrong-research.github.io`. Use the `main` branch and `/` root as the GitHub Pages source. The custom domain is `jossarmstrong.org`.

All pages are static HTML and all canonical metadata uses the custom domain. No client-side JavaScript is required. `.nojekyll` ensures the files are served directly.
