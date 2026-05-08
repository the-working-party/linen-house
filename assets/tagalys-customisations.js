var TagalysCustomisations = {};

TagalysCustomisations.setTagalysConfiguration = function () {
  console.log("TagalysCustomisations.setTagalysConfiguration");

  var configuration = {
    api: {
      serverUrl: "https://api-r3.tagalys.com",
    },
    locale: "en-AU",
    currency: {
      displayFormatter: "{{currencyLabel}}{{value}}",
      code: "AUD",
      label: "$",
      fractionalDigits: 2,
      forceFractionalDigits: true,
    },
    analyticsStorageConsentProvided: function () {
      // return true/false based on user's consent settings
      return true;
    },
    track: true,
  };
  Tagalys.setConfiguration(configuration);
};

TagalysCustomisations.setPlatformConfiguration = function () {
  var platformConfiguration = {
    platform: "Shopify",
    countryCode: "AU", // replace with Shopify.country to set the shopper's chosen country
    baseCountryCode: "AU",
    useStorefrontAPIForSecondaryMarkets: true,
    waitForStorefrontAPI: true,
    storefrontAPI: {
      accessToken: "b68cbd31da924e9f65bf7ea475ec1036",
      myShopifyDomain: "linen-house-au.myshopify.com",
    },
    metafields: {
      products: [],
    },
  };
  Tagalys.setPlatformConfiguration(platformConfiguration);
};

TagalysCustomisations.initSearchSuggestions = function () {
  Tagalys.UIWidgets.SearchSuggestions.init("[data-search-input]", {
    searchResultsURL: "search.html",
    templates: {
      widget: {
        options: {
          sections: {
            products: {
              include: ["total_count", "items"],
              count: 10,
            },
            collections: {
              count: 10,
            },
            pages: {
              count: 10,
            },
          },
        },
      },
    },
  });
};

TagalysCustomisations.initSearchResults = function () {
  Tagalys.UIWidgets.SearchResults.init("[data-search-results]", {
    templates: {
      noResults: {
        options: {
          widgets: [
            {
              recommendationId: "cad2d1900eeaa813e252",
            },
          ],
        },
      },
    },
  });
};

TagalysCustomisations.initProductBasedWidget = function () {
  console.log(
    "TagalysCustomisations.initProductBasedWidget - product based widget",
  );
  Tagalys.UIWidgets.Recommendations.init("[data-product-based-widget]", {
    recommendationId: "4134a75cb4a6b58e885a",
    productIds: ["8571887354029"],
  });
};
