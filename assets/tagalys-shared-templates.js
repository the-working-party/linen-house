// @ts-nocheck — theme asset; Tagalys SDK provides runtime `html` tagged templates.
/**
 * Shared Tagalys SDK template overrides (filters, recommendation product tiles).
 * Loaded synchronously from `snippets/tagalys-config.liquid` before the deferred SDK.
 */
(function () {
  window.TagalysCustomisations = window.TagalysCustomisations || {};

  TagalysCustomisations.getSharedFiltersTemplate =
    function getSharedFiltersTemplate() {
      return {
        options: {
          collapsible: true,
          includeSortOptionsInFilters: false,
          autoCollapse: true,
          showAppliedFilters: true,
          showClearAllFilters: true,
          showClearActionForIndividualFilters: true,
          showMatchingProductsCount: true,
          defaultExpandedFilters: [],
          showFiltersInDrawer: true,
        },
        render: function renderFilters(html, args) {
          const props = args.props;
          const labels = args.labels;
          const helpers = props.helpers;

          const filters = helpers.getFilters();
          const appliedFilters = helpers.getAppliedFilters(true);
          const showClearAllFiltersAction =
            props.showClearAllFilters && appliedFilters.length;
          const classes = ["filters"];
          if (props.collapsible) {
            classes.push("collapsible");
          }

          const className = classes.join(" ");
          return html`
            <div class=${className}>
              <${args.templates.filtersHeader} />
              ${props.showAppliedFilters
                ? html` <${args.templates.appliedFilters} /> `
                : null}
              ${showClearAllFiltersAction
                ? html`
                    <div
                      class="clear-all-filters"
                      onclick=${helpers.clearAllFilters}
                    >
                      ${labels.filters.clearAllFilters}
                    </div>
                  `
                : null}
              ${props.includeSortOptionsInFilters === "top"
                ? html` <${args.templates.sortOptionInFilters} /> `
                : null}
              ${filters.map(
                (filter) => html`<${args.templates.filter} filter=${filter} />`,
              )}
              ${props.includeSortOptionsInFilters === true ||
              props.includeSortOptionsInFilters === "bottom"
                ? html` <${args.templates.sortOptionInFilters} /> `
                : null}
            </div>
          `;
        },
      };
    };

  TagalysCustomisations.getSharedProductTemplate =
    function getSharedProductTemplate() {
      console.log("getSharedProductTemplate");

      return {
        render: function renderProduct(html, args) {
          const props = args.props;
          const product = props.product;
          const helpers = props.helpers;

          const navigateToProductDetailPage = (event) => {
            helpers.navigateToProductDetailPage(event, product);
          };

          const productOptions = helpers.getTemplateOptions("product");
          const productLink = productOptions.productPageUrl(product);

          return html`
            <div class="product" onClick=${navigateToProductDetailPage}>
              <a class="product-link" href=${productLink} target="_blank">
                <span class="product-image-container">
                  ${product.featured_image
                    ? html`<img
                        class="product-image"
                        data-src=${product.featured_image.src}
                        alt=${product.title}
                      />`
                    : null}
                </span>
                <div class="product-details">
                  <span class="product-name"
                    >${product.title} - template override!!!</span
                  >
                  ${helpers.isStorefrontAPICallPending()
                    ? html`<span class="skeleton-box"></span>`
                    : html`<span
                        class=${`product-prices${
                          helpers.isProductOnSale(
                            product.compare_at_price,
                            product.price,
                          )
                            ? " discounted"
                            : " full-price"
                        }`}
                      >
                        ${helpers.isProductOnSale(
                          product.compare_at_price,
                          product.price,
                        )
                          ? html`<span class="product-price-discounted"
                              >${helpers.formatCurrency(product.price)}</span
                            >`
                          : null}
                        <span class="product-price-regular">
                          ${helpers.formatCurrency(
                            product.compare_at_price === null
                              ? product.price
                              : product.compare_at_price,
                          )}
                        </span>
                      </span>`}
                </div>
              </a>
            </div>
          `;
        },
      };
    };
})();
