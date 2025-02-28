/**
 * Copyright 2018 The Subscribe with Google Authors. All Rights Reserved.
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

import {createElement} from './dom';

export class Preconnect {
  /**
   * @param {!Document} doc
   */
  constructor(doc) {
    /** @private @const {!Document} */
    this.doc_ = doc;
  }

  /**
   * @param {string} url
   */
  preconnect(url) {
    this.pre_(url, 'preconnect');
  }

  /**
   * @param {string} url
   */
  prefetch(url) {
    this.pre_(url, 'preconnect prefetch');
  }

  /**
   * @param {string} url
   * @param {string} rel
   * @private
   */
  pre_(url, rel) {
    // <link rel="prefetch" href="...">
    const linkEl = createElement(this.doc_, 'link', {
      'rel': rel,
      'href': url,
    });
    this.doc_.head.appendChild(linkEl);
  }
}
