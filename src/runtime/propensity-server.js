/**
 * Copyright 2019 The Subscribe with Google Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  AnalyticsEvent,
  EventOriginator,
  EventParams,
} from '../proto/api_messages';
import {addQueryParam} from '../utils/url';
import {adsUrl} from './services';
import {analyticsEventToPublisherEvent} from './event-type-mapping';
import {isBoolean, isObject} from '../utils/types';

/**
 * Implements interface to Propensity server
 */
export class PropensityServer {
  /**
   * Page configuration is known when Propensity API
   * is available, publication ID is therefore used
   * in constructor for the server interface.
   * @param {!Window} win
   * @param {!./deps.DepsDef} deps
   * @param {!./fetcher.Fetcher} fetcher
   */
  constructor(win, deps, fetcher) {
    /** @private @const {!Window} */
    this.win_ = win;
    /** @private @const {!./deps.DepsDef} */
    this.deps_ = deps;
    /** @private @const {string} */
    this.publicationId_ = this.deps_.pageConfig().getPublicationId();
    /** @private {?string} */
    this.clientId_ = null;
    /** @private @const {!./fetcher.Fetcher} */
    this.fetcher_ = fetcher;
    /** @private @const {number} */
    this.version_ = 1;

    this.deps_
      .eventManager()
      .registerEventListener(this.handleClientEvent_.bind(this));
  }

  /**
   * @private
   * @return {string}
   */
  getDocumentCookie_() {
    return this.win_.document.cookie;
  }

  /**
   * Returns the client ID to be used.
   * @return {?string}
   * @private
   */
  getClientId_() {
    if (!this.clientId_) {
      // Match '__gads' (name of the cookie) dropped by Ads Tag.
      const gadsmatch = this.getDocumentCookie_().match(
        '(^|;)\\s*__gads\\s*=\\s*([^;]+)'
      );
      // Since the cookie will be consumed using decodeURIComponent(),
      // use encodeURIComponent() here to match.
      this.clientId_ = gadsmatch && encodeURIComponent(gadsmatch.pop());
    }
    return this.clientId_;
  }

  /**
   * @private
   * @param {string} url
   * @return {string}
   */
  propensityUrl_(url) {
    url = addQueryParam(url, 'u_tz', '240');
    url = addQueryParam(url, 'v', String(this.version_));
    const clientId = this.getClientId_();
    if (clientId) {
      url = addQueryParam(url, 'cookie', clientId);
    }
    url = addQueryParam(url, 'cdm', this.win_.location.hostname);
    return url;
  }

  /**
   * @param {string} state
   * @param {?string} productsOrSkus
   */
  sendSubscriptionState(state, productsOrSkus) {
    const init = /** @type {!RequestInit} */ ({
      method: 'GET',
      credentials: 'include',
    });
    let url = adsUrl('/subopt/data');
    url = addQueryParam(url, 'states', this.publicationId_ + ':' + state);
    if (productsOrSkus) {
      url = addQueryParam(url, 'extrainfo', productsOrSkus);
    }
    return this.fetcher_.fetch(this.propensityUrl_(url), init);
  }

  /**
   * @param {string} event
   * @param {?string} context
   * @private
   */
  sendEvent_(event, context) {
    const init = /** @type {!RequestInit} */ ({
      method: 'GET',
      credentials: 'include',
    });
    let url = adsUrl('/subopt/data');
    url = addQueryParam(url, 'events', this.publicationId_ + ':' + event);
    if (context) {
      url = addQueryParam(url, 'extrainfo', context);
    }
    return this.fetcher_.fetch(this.propensityUrl_(url), init);
  }

  /**
   *
   * @param {!../api/client-event-manager-api.ClientEvent} event
   */
  handleClientEvent_(event) {
    // Propensity does not need this data and does not have the right to
    // it at this time.  We can consider this if necessary in the future.
    if (event.eventOriginator === EventOriginator.SHOWCASE_CLIENT) {
      return;
    }

    /**
     * Does a live check of the config because we don't know when publisher
     * called to enable (it may be after a consent dialog).
     */
    if (
      !this.deps_.config().enablePropensity &&
      event.eventOriginator !== EventOriginator.PROPENSITY_CLIENT
    ) {
      return;
    }

    if (event.eventType === AnalyticsEvent.EVENT_SUBSCRIPTION_STATE) {
      this.sendSubscriptionState(
        event.additionalParameters['state'],
        event.additionalParameters['productsOrSkus']
      );
      return;
    }
    const propEvent = analyticsEventToPublisherEvent(event.eventType);
    if (propEvent == null) {
      return;
    }
    let additionalParameters = event.additionalParameters;
    // The EventParams object is private to SwG analytics.  Do not send.
    if (additionalParameters instanceof EventParams) {
      additionalParameters = undefined;
    }
    if (isBoolean(event.isFromUserAction)) {
      if (!isObject(additionalParameters)) {
        additionalParameters = {};
      }
      additionalParameters['is_active'] = event.isFromUserAction;
    }
    this.sendEvent_(
      propEvent,
      JSON.stringify(/** @type {?JsonObject} */ (additionalParameters))
    );
  }

  /**
   * @param {JsonObject} response
   * @return {!../api/propensity-api.PropensityScore}
   */
  parsePropensityResponse_(response) {
    let defaultScore =
      /** @type {!../api/propensity-api.PropensityScore} */ ({});
    if (!response['header']) {
      defaultScore = /** @type {!../api/propensity-api.PropensityScore} */ ({
        header: {ok: false},
        body: {error: 'No valid response'},
      });
      return defaultScore;
    }
    const status = response['header'];
    let scoreDetails = undefined;
    if (status['ok']) {
      const scores = response['scores'];
      scoreDetails = [];
      for (let i = 0; i < scores.length; i++) {
        const result = scores[i];
        const scoreStatus = !!result['score'];
        let scoreDetail;
        if (scoreStatus) {
          const value = /** @type {!../api/propensity-api.Score} */ ({
            value: result['score'],
            bucketed: result['score_type'] == 2,
          });
          scoreDetail = /** @type {!../api/propensity-api.Body} */ ({
            product: result['product'],
            score: value,
          });
        } else {
          scoreDetail = /** @type {!../api/propensity-api.Body} */ ({
            product: result['product'],
            error: result['error_message'],
          });
        }
        scoreDetails.push(scoreDetail);
      }
      if (scoreDetails) {
        defaultScore = /** @type {!../api/propensity-api.PropensityScore} */ ({
          header: {ok: true},
          body: {scores: scoreDetails},
        });
      }
      return defaultScore;
    }
    defaultScore = /** @type {!../api/propensity-api.PropensityScore} */ ({
      header: {ok: false},
      body: {error: response['error']},
    });
    return defaultScore;
  }
  /**
   * @param {string} referrer
   * @param {string} type
   * @return {?Promise<../api/propensity-api.PropensityScore>}
   */
  async getPropensity(referrer, type) {
    const init = /** @type {!RequestInit} */ ({
      method: 'GET',
      credentials: 'include',
    });
    const url =
      adsUrl('/subopt/pts?products=') +
      this.publicationId_ +
      '&type=' +
      type +
      '&ref=' +
      referrer;
    const response = await this.fetcher_.fetch(this.propensityUrl_(url), init);
    const responseJson = /** @type {JsonObject} */ (await response.json());
    return this.parsePropensityResponse_(responseJson);
  }
}
