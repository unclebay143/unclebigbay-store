import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter';
import axios from 'axios';
import Typesense from 'typesense';

const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: process.env.TYPESENSE_SEARCH_ONLY_API,
    nodes: [
      {
        host: process.env.TYPESENSE_HOST,
        port: '443',
        protocol: 'https',
      },
    ],
  },

  additionalSearchParameters: {
    queryBy: 'title,category',
  },
});

const searchClient = typesenseInstantsearchAdapter.searchClient;

const search = instantsearch({
  indexName: 'products',
  searchClient,
});

let client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST,
      port: '443',
      protocol: 'https',
    },
  ],
  apiKey: process.env.TYPESENSE_ADMIN_API,
  connectionTimeoutSeconds: 2,
});

const importProducts = async () => {
  try {
    const response = await axios.get('https://fakestoreapi.com/products');

    const convertIdToString = arrayOfProducts => {
      return arrayOfProducts.map(product => {
        product.id = product.id.toString();
        return product;
      });
    };

    // Typesense document's ID must be a typeof string
    const products = convertIdToString(response.data);

    // Import the products as document to Typesense
    client
      .collections('products')
      .documents()
      .import(products, { action: 'create' });
  } catch (error) {
    throw new Error(error);
  }
};

// Call the function to import the products to Typesense
importProducts();

search.addWidgets([
  instantsearch.widgets.searchBox({
    container: '#searchbox',
    placeholder: 'Search for a product',
  }),

  instantsearch.widgets.hits({
    container: '#hits',
    templates: {
      item({ image, title, price, rating }) {
        return `
        <div class="product-card">
        <div>
        <img src="${image}" align="left" alt="" />
        </div>
        <span class="hit-rate">
         ${rating.rate}
        </span>
        <h2 class="hit-title">
        ${title}
        </h2>
        <p class="hit-price">
        $ ${price}
        </p>
        </div>
      `;
      },
    },
  }),
  // instantsearch.widgets.configure({
  //   facets: ['*'],
  //   maxValuesPerFacet: 20,
  // }),
  // instantsearch.widgets.dynamicWidgets({
  //   container: '#dynamic-widgets',
  //   fallbackWidget({ container, attribute }) {
  //     return instantsearch.widgets.refinementList({
  //       container,
  //       attribute,
  //     });
  //   },
  //   widgets: [],
  // }),

  instantsearch.widgets.pagination({
    container: '#pagination',
  }),

  instantsearch.widgets.configure({
    hitsPerPage: 8,
  }),

  instantsearch.widgets.sortBy({
    container: '#sort-by',
    items: [
      { label: 'Default Sort', value: 'products' },
      { label: 'Price: Low to High', value: 'products/sort/price:asc' },
      { label: 'Price: High to Low', value: 'products/sort/price:desc' },
    ],
  }),

  instantsearch.widgets.hitsPerPage({
    container: '#hits-per-page',
    items: [
      { label: '8 per page', value: 8, default: true },
      { label: '12 per page', value: 12 },
    ],
  }),

  instantsearch.widgets.stats({
    container: '#stats',
    templates: {
      text: `
    {{#hasNoResults}}No products{{/hasNoResults}}
    {{#hasOneResult}}1 product{{/hasOneResult}}
    {{#hasManyResults}}{{#helpers.formatNumber}}
    {{nbHits}}{{/helpers.formatNumber}} 
    products{{/hasManyResults}} found in {{processingTimeMS}}ms
  `,
    },
  }),

  instantsearch.widgets.refinementList({
    container: '#category-refinement-list',
    attribute: 'category',
  }),

  instantsearch.widgets.refinementList({
    container: '#price-refinement-list',
    attribute: 'price',
  }),

  instantsearch.widgets.rangeSlider({
    container: '#price-range-slider',
    attribute: 'price',
  }),
]);

search.start();
