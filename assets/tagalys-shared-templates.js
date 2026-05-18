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

  // SVG icon matching assets/icon-add-to-cart.svg, inlined so it is available
  // in this synchronous non-module script without Liquid filter access.
  var QUICK_ADD_ICON =
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">' +
    '<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="var(--icon-stroke-width)" d="M16.608 9.421V6.906H3.392v8.016c0 .567.224 1.112.624 1.513.4.402.941.627 1.506.627H8.63M8.818 3h2.333c.618 0 1.212.247 1.649.686a2.35 2.35 0 0 1 .683 1.658v1.562H6.486V5.344c0-.622.246-1.218.683-1.658A2.33 2.33 0 0 1 8.82 3"/>' +
    '<path stroke="currentColor" stroke-linecap="round" stroke-width="var(--icon-stroke-width)" d="M14.608 12.563v5m2.5-2.5h-5"/>' +
    '</svg>';

  TagalysCustomisations.getSharedProductTemplate =
    function getSharedProductTemplate() {
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

          /**
           * Opens the native Horizon quick-add dialog for this tile.
           * Stops propagation so the tile's navigateToProductDetailPage
           * handler is not also triggered.
           * @param {MouseEvent} event
           */
          const handleQuickAdd = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.tagalysOpenQuickAdd === 'function') {
              window.tagalysOpenQuickAdd(productLink);
            }
          };

          return html`
            <div class="product tagalys-product-tile" onClick=${navigateToProductDetailPage}>
              <a class="product-link" href=${productLink}>
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
                  <span class="product-name">${product.title}</span>
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

              ${/*
                Quick-add overlay — mirrors the .quick-add positioning pattern
                from snippets/quick-add.liquid. Rendered outside the <a> so the
                button click does not trigger link navigation.
                The button delegates to window.tagalysOpenQuickAdd (defined in
                assets/tagalys-quick-add.js) which fetches the product page,
                morphs #quick-add-modal-content, and opens #quick-add-dialog.
              */ null}
              <div class="quick-add tagalys-quick-add" aria-hidden="true">
                <button
                  class="button quick-add__button quick-add__button--choose add-to-cart-button"
                  type="button"
                  aria-label=${"Quick add: " + product.title}
                  onClick=${handleQuickAdd}
                >
                  <span class="add-to-cart-text">
                    <span
                      class="svg-wrapper add-to-cart-icon"
                      dangerouslySetInnerHTML=${{ __html: QUICK_ADD_ICON }}
                    />
                    <span class="add-to-cart-text__content is-visually-hidden-mobile">
                      <span><span>Choose</span></span>
                    </span>
                  </span>
                </button>
              </div>
            </div>
          `;
        },
      };
    };
})();
