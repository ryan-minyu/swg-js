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

import * as st from './style';

describes.realWin('Types', {}, (env) => {
  let win;
  let doc;

  beforeEach(() => {
    win = env.win;
    doc = win.document;
  });

  describe('Style', () => {
    it('check defaultStyle for restricted attributes', () => {
      const defaultStyles = st.defaultStyles;

      expect(defaultStyles.width).to.equal(undefined);
      expect(defaultStyles.left).to.equal(undefined);
      expect(defaultStyles['margin-left']).to.equal(undefined);
    });

    it('setStyle', () => {
      const element = doc.createElement('div');
      st.setStyle(element, 'width', '1px');
      expect(element.style.width).to.equal('1px');
    });

    it('setStyle with vendor prefix', () => {
      const element = {style: {WebkitTransitionDuration: ''}};
      st.setStyle(element, 'transitionDuration', '1s', undefined, true);
      expect(element.style.WebkitTransitionDuration).to.equal('1s');
    });

    it('setStyles', () => {
      const element = doc.createElement('div');
      st.setStyles(element, {
        width: st.px(101),
        height: st.px(102),
      });
      expect(element.style.width).to.equal('101px');
      expect(element.style.height).to.equal('102px');
    });

    it('resetAllStyles', () => {
      const element = doc.createElement('div');
      st.resetAllStyles(element);
      expect(element.style.objectFit).to.equal('fill');
      expect(element.style.opacity).to.equal('1');
      expect(element.style.display).to.equal('block');
    });

    it('px', () => {
      expect(st.px(0)).to.equal('0px');
      expect(st.px(101)).to.equal('101px');
    });

    it('translateX', () => {
      expect(st.translateX(101)).to.equal('translateX(101px)');
      expect(st.translateX('101vw')).to.equal('translateX(101vw)');
    });

    it('translate', () => {
      expect(st.translate(101, 201)).to.equal('translate(101px, 201px)');
      expect(st.translate('101vw, 201em')).to.equal('translate(101vw, 201em)');
      expect(st.translate(101)).to.equal('translate(101px)');
      expect(st.translate('101vw')).to.equal('translate(101vw)');
    });

    it('camelCaseToTitleCase', () => {
      const str = 'theQuickBrownFox';
      expect(st.camelCaseToTitleCase(str)).to.equal('TheQuickBrownFox');
    });

    describe('getVendorJsPropertyName', () => {
      it('no prefix', () => {
        const element = {style: {transitionDuration: ''}};
        const prop = st.getVendorJsPropertyName(
          element.style,
          'transitionDuration',
          true
        );
        expect(prop).to.equal('transitionDuration');
      });

      it('should use cached previous result', () => {
        let element = {style: {transitionDuration: ''}};
        let prop = st.getVendorJsPropertyName(
          element.style,
          'transitionDuration'
        );
        expect(prop).to.equal('transitionDuration');

        element = {style: {WebkitTransitionDuration: ''}};
        prop = st.getVendorJsPropertyName(element.style, 'transitionDuration');
        expect(prop).to.equal('transitionDuration');
      });

      it('Webkit', () => {
        const element = {style: {WebkitTransitionDuration: ''}};
        const prop = st.getVendorJsPropertyName(
          element.style,
          'transitionDuration',
          true
        );
        expect(prop).to.equal('WebkitTransitionDuration');
      });

      it('Moz', () => {
        const element = {style: {MozTransitionDuration: ''}};
        const prop = st.getVendorJsPropertyName(
          element.style,
          'transitionDuration',
          true
        );
        expect(prop).to.equal('MozTransitionDuration');
      });

      it('O opera', () => {
        const element = {style: {OTransitionDuration: ''}};
        const prop = st.getVendorJsPropertyName(
          element.style,
          'transitionDuration',
          true
        );
        expect(prop).to.equal('OTransitionDuration');
      });
    });
  });
});
