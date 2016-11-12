/*
* mocha's bdd syntax is inspired in RSpec
*   please read: http://betterspecs.org/
*/
require('./util/globals');
const fetchWrap = require('../src/main');
const middleware = require('../src/middleware');

describe('fetchWrap/middleware', function() {
  function mockFetch(result) {
    const calls = [];
    const mockedFetch = function mockedFetch(url, options) {
      const call = { url: url, options: options };
      calls.push(call);
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    };
    mockedFetch.calls = calls;
    return mockedFetch;
  };

  describe('#optionsByUrlPattern', function() {
    it('adds an option to a matching url', function() {
      const mockedFetch = mockFetch(123);
      const fetch = fetchWrap(mockedFetch, [
        middleware.optionsByUrlPattern([{
          for: 'http://localhost/*',
          options: {
            headers: {
              Authorization: 'Token qwerty'
            }
          }
        }])
      ]);
      return fetch('http://localhost/fake-url').then(function(result) {
        expect(mockedFetch.calls[0].options).to.eql({
          headers: {
            Authorization: 'Token qwerty'
          }
        });
      });
    });
    it('doesn\'t affect unmatching url', function() {
      const mockedFetch = mockFetch(123);
      const fetch = fetchWrap(mockedFetch, [
        middleware.optionsByUrlPattern([{
          for: 'http://localhost/*',
          options: {
            headers: {
              Authorization: 'Token qwerty'
            }
          }
        }])
      ]);
      return fetch('http://somedomain.com/fake-url').then(function(result) {
        expect(mockedFetch.calls[0].options).to.eql({});
      });
    });
  });

  describe('#logger', function() {
    it('logs request and success', function() {
      const mockedFetch = mockFetch(123);
      const output = [];
      const fetch = fetchWrap(mockedFetch, [
        middleware.logger({
          success: true,
          log: function(msg) { output.push(msg); }
        })
      ]);
      return fetch('http://localhost/fake-url').then(function(result) {
        expect(output).to.eql([
          '[fetch] GET http://localhost/fake-url',
          '[fetch] SUCCESS for GET http://localhost/fake-url'
        ]);
      });
    });
    it('logs request and error', function() {
      const mockedFetch = mockFetch(new Error('request failed'));
      const output = [];
      const fetch = fetchWrap(mockedFetch, [
        middleware.logger({
          log: function(msg) { output.push(msg); }
        })
      ]);
      return fetch('http://localhost/fake-url').catch(function(err) {
        /* swallow error */
        err = null;
      }).then(function(result) {
        expect(output).to.eql([
          '[fetch] GET http://localhost/fake-url',
          '[fetch] FAILED request failed for GET http://localhost/fake-url'
        ]);
      });
    });

    describe('#urlParams', function() {
      it('fills url tokens', function() {
        const mockedFetch = mockFetch(123);
        const fetch = fetchWrap(mockedFetch, [
          middleware.urlParams({
            id: 57,
            section: 'settings'
          })
        ]);
        return fetch('http://localhost/users/{id}/{section}').then(function(result) {
          expect(mockedFetch.calls[0].url).to.eql(
            'http://localhost/users/57/settings'
          );
        });
      });
      it('fills with additional params', function() {
        const mockedFetch = mockFetch(123);
        const fetch = fetchWrap(mockedFetch, [
          middleware.urlParams({
            id: 57
          })
        ]);
        return fetch('http://localhost/users/{id}/{section}', {
          params: {
            section: 'notifications',
            token: 1234,
            'email': 'john@smith.com'
          }
        }).then(function(result) {
          expect(mockedFetch.calls[0].url).to.eql(
            'http://localhost/users/57/notifications?token=1234&email=john%40smith.com'
          );
        });
      });
      it('fails if token couldn\'t be replaced', function() {
        const mockedFetch = mockFetch(123);
        const fetch = fetchWrap(mockedFetch, [
          middleware.urlParams({
            id: 57
          })
        ]);
        return expect(fetch('http://localhost/users/{id}/{section}', {
          params: {
            token: 1234,
            'email': 'john@smith.com'
          }
        })).to.eventually.be.rejectedWith('url param not found: {section}');
      });
      it('fail is missing can be disabled', function() {
        const mockedFetch = mockFetch(123);
        const fetch = fetchWrap(mockedFetch, [
          middleware.urlParams({
            id: 57
          }, false)
        ]);
        return expect(fetch('http://localhost/users/{id}/{section}', {
          params: {
            token: 1234,
            'email': 'john@smith.com'
          }
        })).to.eventually.eql(123);
      });
    });

    describe('#sendJSON', function() {
      it('sends body as JSON', function() {
        const mockedFetch = mockFetch(123);
        const fetch = fetchWrap(mockedFetch, [
          middleware.sendJSON()
        ]);
        return fetch('http://localhost/users', {
          method: 'POST',
          body: {
            name: 'john'
          }
        }).then(function() {
          expect(mockedFetch.calls[0].options).to.eql({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: '{"name":"john"}'
          });
        });
      });
    });

    describe('#receiveJSON', function() {
      it('receives JSON responses', function() {
        const mockedFetch = mockFetch({
          ok: true,
          headers: {
            get: function(name) {
              if (name === 'content-type') {
                return 'application/json';
              }
            }
          },
          text: function() {
            return Promise.resolve('{"name":"john","birthdate":"1936-03-01T00:00:00.000Z"}');
          }
        });
        const fetch = fetchWrap(mockedFetch, [
          middleware.receiveJSON()
        ]);
        return fetch('http://localhost/users').then(function(result) {
          expect(result).to.eql({
            name: 'john',
            birthdate: new Date(Date.UTC(1936, 2, 1))
          });
        });
      });
      it('fails on http errors', function() {
        const mockedFetch = mockFetch({
          ok: false,
          status: 403,
          statusText: 'Not Authorized'
        });
        const fetch = fetchWrap(mockedFetch, [
          middleware.receiveJSON()
        ]);
        return expect(fetch('http://localhost/users')).to.eventually
          .be.rejectedWith('http error 403: Not Authorized');
      });
    });

    describe('#testing', function() {
      it('fails if not mocked', function() {
        const mockedFetch = mockFetch(123);
        const fetch = fetchWrap(mockedFetch, [
          middleware.testing({
          })
        ]);
        return expect(fetch('http://localhost/users', { method: 'PUT' }))
          .to.eventually.be.rejectedWith('[fetch] request mock not found for: http://localhost/users');
      });
      it('can mock the response', function() {
        const mockedFetch = mockFetch(123);
        const fetch = fetchWrap(mockedFetch, [
          middleware.testing({
            mock: 321
          })
        ]);
        return fetch('http://localhost/users', { method: 'PUT' })
        .then(function(result) {
          expect(result).to.eql(321);
        });
      });
      it('can spy requests', function() {
        const mockedFetch = mockFetch(123);
        const spyLog = [];
        const fetch = fetchWrap(mockedFetch, [
          middleware.testing({
            spy: function() {
              spyLog.push(Array.prototype.slice.apply(arguments));
            },
            mock: 321
          })
        ]);
        return fetch('http://localhost/users', { method: 'PUT' })
        .then(function(result) {
          expect(spyLog).to.eql([
            ['http://localhost/users', { method: 'PUT' }]
          ]);
        });
      });
    });
  });
});
