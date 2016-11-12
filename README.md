fetch-wrap
====
[![Build Status](https://secure.travis-ci.org/benjamine/fetch-wrap.svg)](http://travis-ci.org/benjamine/fetch-wrap)
[![Code Climate](https://codeclimate.com/github/benjamine/fetch-wrap/badges/gpa.svg)](https://codeclimate.com/github/benjamine/fetch-wrap)
[![Test Coverage](https://codeclimate.com/github/benjamine/fetch-wrap/badges/coverage.svg)](https://codeclimate.com/github/benjamine/fetch-wrap)
[![NPM version](https://badge.fury.io/js/fetch-wrap.svg)](http://badge.fury.io/js/fetch-wrap)
[![NPM dependencies](https://david-dm.org/benjamine/fetch-wrap.svg)](https://david-dm.org/benjamine/fetch-wrap)


extend WHATWG fetch with middleware

Install
-------
``` sh
npm install fetch-wrap --save
```

Usage
-----
``` js
const fetchWrap = require('fetchWrap');

// you can use native fetch(), or the implementation you prefer
const fetch = require('fetch-ponyfill')();

// extend fetch with a list of wrappers
const fetch = fetchWrap(fetch, [

  function(url, options, fetch) {
    // modify url or options
    return fetch(url.replace(/^(http:)?/, 'https:'), options);
  },

  function(url, options, fetch) {
    // add headers
    return fetch(url, fetchWrap.merge({}, options, {
      headers: {
        Authorization: 'Token 123456'
      }
    });
  }

  function(url, options, fetch) {
    // modify result
    return fetch(url, options).then(function(response) {
      if (!response.ok) {
        throw new Error(result.status + ' ' + result.statusText);
      }
      if (/application\/json/.test(result.headers.get('content-type'))) {
        return response.json();
      }
      return response.text();
    });
  }

  function(url, options, fetch) {
    // catch errors
    return fetch(url, options).catch(function(err) {
      console.error(err);
      throw err;
    });
  }

]);


// use your powered-up fetch!

fetch('http://somedomain.com/news.json').then(function(news) {
  // GET https://somedomain.com/news.json with Authorization header, and parsed to json
  console.log(news.items);
});

```
