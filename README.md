# jossarmstrong.org

Static HTML/CSS scholarly website for Joss Armstrong.

The catalogue contains 22 works: 9 peer-reviewed published papers, 9 preprints (8 arXiv and 1 Zenodo), 3 SSRN working papers, and 1 published white paper. Stable IDs in `data/works.json` also identify the corresponding articles in `works/index.html`; update both files together. Within each category the works are ordered by descending year, preserving the existing order for ties.

TACIT and ORACLE have author companion pages at `/works/tacit/` and `/works/oracle/`, including explanations, scoped evaluation results, publication metadata and downloadable BibTeX citations. For these records, `url` remains the published-paper DOI and `page_url` identifies the companion page used by the Works title link. Update each page's citation metadata, JSON-LD and `citation.bib` together when correcting bibliographic details. Shared companion-page styles are in `css/paper.css`.

Four more companions provide interactive or animated explanations at `/works/ib/`, `/works/hierarchical-selection/`, `/works/allocation-verification/` and `/works/camino/`. Their original DOI/arXiv URLs remain in `url`; `page_url` is separate. IB follows arXiv:2604.26744v2, hierarchical selection follows arXiv:2605.00921v2, and allocation/verification follows arXiv:2604.26808v3. Keep their preprint status and version links explicit.

The optional visual controls use `js/explainers.js`, pure calculations in `js/explainer-math.mjs`, and `css/explainers.css`. There are no third-party assets or JavaScript dependencies. Animations begin only on request, can be paused or stepped manually, pause when the tab is hidden, and respect reduced-motion preferences. Static examples, tables, prose and citations remain available without JavaScript. CAMINO's walkthrough has qualitative effects, not invented scores. The deployed site needs no build step.

All eight companions now include visual controls. TACIT demonstrates reputation-weighted votes and observation-gated reputation updates. ORACLE steps through the recorded workflow, including a rejected early decision. The two additional published-paper companions are `/works/pecdafs/` (comparison cohorts and possible KPI degradation) and `/works/cell-similarity/` (counter patterns, correlations and operating levels). Their controls and calculations are in `js/network-explainers.mjs` and `js/network-math.mjs`, loaded through the existing entry module. Teaching values and votes are explicitly labelled as constructed; they are separate from reported empirical results. Similarity does not supply fabricated SHAP values, and the ORACLE animation does not simulate measured latency.

Publish the contents of this directory at the root of the public repository `jossarmstrong-research/jossarmstrong-research.github.io`. Use the `main` branch and `/` root as the GitHub Pages source. The custom domain is `jossarmstrong.org`.

All pages are static HTML and all canonical metadata uses the custom domain. Client-side JavaScript is optional for the interactive controls and is not required to read the content. `.nojekyll` ensures the files are served directly.
