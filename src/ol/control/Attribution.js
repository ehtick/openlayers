/**
 * @module ol/control/Attribution
 */
import {equals} from '../array.js';
import {CLASS_COLLAPSED, CLASS_CONTROL, CLASS_UNSELECTABLE} from '../css.js';
import {removeChildren, replaceNode} from '../dom.js';
import EventType from '../events/EventType.js';
import {toPromise} from '../functions.js';
import Control from './Control.js';

/**
 * @typedef {Object} Options
 * @property {string} [className='ol-attribution'] CSS class name.
 * @property {HTMLElement|string} [target] Specify a target if you
 * want the control to be rendered outside of the map's
 * viewport.
 * @property {boolean} [collapsible] Specify if attributions can
 * be collapsed. If not specified, sources control this behavior with their
 * `attributionsCollapsible` setting.
 * @property {boolean} [collapsed=true] Specify if attributions should
 * be collapsed at startup.
 * @property {string} [tipLabel='Attributions'] Text label to use for the button tip.
 * @property {string|HTMLElement} [label='i'] Text label to use for the
 * collapsed attributions button.
 * Instead of text, also an element (e.g. a `span` element) can be used.
 * @property {string} [expandClassName=className + '-expand'] CSS class name for the
 * collapsed attributions button.
 * @property {string|HTMLElement} [collapseLabel='›'] Text label to use
 * for the expanded attributions button.
 * Instead of text, also an element (e.g. a `span` element) can be used.
 * @property {string} [collapseClassName=className + '-collapse'] CSS class name for the
 * expanded attributions button.
 * @property {function(import("../MapEvent.js").default):void} [render] Function called when
 * the control should be re-rendered. This is called in a `requestAnimationFrame`
 * callback.
 * @property {string|Array<string>|undefined} [attributions] Optional attribution(s) that will always be
 * displayed regardless of the layers rendered.
 * **Caution:** Attributions are rendered dynamically using `innerHTML`, which can lead to potential
 * [**XSS (Cross-Site Scripting)**](https://en.wikipedia.org/wiki/Cross-site_scripting) vulnerabilities.
 * Use this feature only for trusted content
 * or ensure that the content is properly sanitized before inserting it.
 */

/**
 * @classdesc
 * Control to show all the attributions associated with the layer sources
 * in the map. This control is one of the default controls included in maps.
 * By default it will show in the bottom right portion of the map, but this can
 * be changed by using a css selector for `.ol-attribution`.
 *
 * @api
 */
class Attribution extends Control {
  /**
   * @param {Options} [options] Attribution options.
   */
  constructor(options) {
    options = options ? options : {};

    super({
      element: document.createElement('div'),
      render: options.render,
      target: options.target,
    });

    /**
     * @private
     * @type {HTMLElement}
     */
    this.ulElement_ = document.createElement('ul');

    /**
     * @private
     * @type {boolean}
     */
    this.collapsed_ =
      options.collapsed !== undefined ? options.collapsed : true;

    /**
     * @private
     * @type {boolean}
     */
    this.userCollapsed_ = this.collapsed_;

    /**
     * @private
     * @type {boolean}
     */
    this.overrideCollapsible_ = options.collapsible !== undefined;

    /**
     * @private
     * @type {boolean}
     */
    this.collapsible_ =
      options.collapsible !== undefined ? options.collapsible : true;

    if (!this.collapsible_) {
      this.collapsed_ = false;
    }

    /**
     * @private
     * @type {string | Array<string> | undefined}
     */
    this.attributions_ = options.attributions;

    const className =
      options.className !== undefined ? options.className : 'ol-attribution';

    const tipLabel =
      options.tipLabel !== undefined ? options.tipLabel : 'Attributions';

    const expandClassName =
      options.expandClassName !== undefined
        ? options.expandClassName
        : className + '-expand';

    const collapseLabel =
      options.collapseLabel !== undefined ? options.collapseLabel : '\u203A';

    const collapseClassName =
      options.collapseClassName !== undefined
        ? options.collapseClassName
        : className + '-collapse';

    if (typeof collapseLabel === 'string') {
      /**
       * @private
       * @type {HTMLElement}
       */
      this.collapseLabel_ = document.createElement('span');
      this.collapseLabel_.textContent = collapseLabel;
      this.collapseLabel_.className = collapseClassName;
    } else {
      this.collapseLabel_ = collapseLabel;
    }

    const label = options.label !== undefined ? options.label : 'i';

    if (typeof label === 'string') {
      /**
       * @private
       * @type {HTMLElement}
       */
      this.label_ = document.createElement('span');
      this.label_.textContent = label;
      this.label_.className = expandClassName;
    } else {
      this.label_ = label;
    }

    const activeLabel =
      this.collapsible_ && !this.collapsed_ ? this.collapseLabel_ : this.label_;

    /**
     * @private
     * @type {HTMLElement}
     */
    this.toggleButton_ = document.createElement('button');
    this.toggleButton_.setAttribute('type', 'button');
    this.toggleButton_.setAttribute('aria-expanded', String(!this.collapsed_));
    this.toggleButton_.title = tipLabel;
    this.toggleButton_.appendChild(activeLabel);

    this.toggleButton_.addEventListener(
      EventType.CLICK,
      this.handleClick_.bind(this),
      false,
    );

    const cssClasses =
      className +
      ' ' +
      CLASS_UNSELECTABLE +
      ' ' +
      CLASS_CONTROL +
      (this.collapsed_ && this.collapsible_ ? ' ' + CLASS_COLLAPSED : '') +
      (this.collapsible_ ? '' : ' ol-uncollapsible');
    const element = this.element;
    element.className = cssClasses;
    element.appendChild(this.toggleButton_);
    element.appendChild(this.ulElement_);

    /**
     * A list of currently rendered resolutions.
     * @type {Array<string>}
     * @private
     */
    this.renderedAttributions_ = [];

    /**
     * @private
     * @type {boolean}
     */
    this.renderedVisible_ = true;
  }

  /**
   * Collect a list of visible attributions and set the collapsible state.
   * @param {import("../Map.js").FrameState} frameState Frame state.
   * @return {Array<string>} Attributions.
   * @private
   */
  collectSourceAttributions_(frameState) {
    const layers = this.getMap().getAllLayers();
    const visibleAttributions = new Set(
      layers.flatMap((layer) => layer.getAttributions(frameState)),
    );
    if (this.attributions_ !== undefined) {
      Array.isArray(this.attributions_)
        ? this.attributions_.forEach((item) => visibleAttributions.add(item))
        : visibleAttributions.add(this.attributions_);
    }

    if (!this.overrideCollapsible_) {
      const collapsible = !layers.some(
        (layer) => layer.getSource()?.getAttributionsCollapsible() === false,
      );
      this.setCollapsible(collapsible);
    }
    return Array.from(visibleAttributions);
  }

  /**
   * @private
   * @param {?import("../Map.js").FrameState} frameState Frame state.
   */
  async updateElement_(frameState) {
    if (!frameState) {
      if (this.renderedVisible_) {
        this.element.style.display = 'none';
        this.renderedVisible_ = false;
      }
      return;
    }

    const attributions = await Promise.all(
      this.collectSourceAttributions_(frameState).map((attribution) =>
        toPromise(() => attribution),
      ),
    );

    const visible = attributions.length > 0;
    if (this.renderedVisible_ != visible) {
      this.element.style.display = visible ? '' : 'none';
      this.renderedVisible_ = visible;
    }

    if (equals(attributions, this.renderedAttributions_)) {
      return;
    }

    removeChildren(this.ulElement_);

    // append the attributions
    for (let i = 0, ii = attributions.length; i < ii; ++i) {
      const element = document.createElement('li');
      element.innerHTML = attributions[i];
      this.ulElement_.appendChild(element);
    }

    this.renderedAttributions_ = attributions;
  }

  /**
   * @param {MouseEvent} event The event to handle
   * @private
   */
  handleClick_(event) {
    event.preventDefault();
    this.handleToggle_();
    this.userCollapsed_ = this.collapsed_;
  }

  /**
   * @private
   */
  handleToggle_() {
    this.element.classList.toggle(CLASS_COLLAPSED);
    if (this.collapsed_) {
      replaceNode(this.collapseLabel_, this.label_);
    } else {
      replaceNode(this.label_, this.collapseLabel_);
    }
    this.collapsed_ = !this.collapsed_;
    this.toggleButton_.setAttribute('aria-expanded', String(!this.collapsed_));
  }

  /**
   * Return `true` if the attribution is collapsible, `false` otherwise.
   * @return {boolean} True if the widget is collapsible.
   * @api
   */
  getCollapsible() {
    return this.collapsible_;
  }

  /**
   * Set whether the attribution should be collapsible.
   * @param {boolean} collapsible True if the widget is collapsible.
   * @api
   */
  setCollapsible(collapsible) {
    if (this.collapsible_ === collapsible) {
      return;
    }
    this.collapsible_ = collapsible;
    this.element.classList.toggle('ol-uncollapsible');
    if (this.userCollapsed_) {
      this.handleToggle_();
    }
  }

  /**
   * Collapse or expand the attribution according to the passed parameter. Will
   * not do anything if the attribution isn't collapsible or if the current
   * collapsed state is already the one requested.
   * @param {boolean} collapsed True if the widget is collapsed.
   * @api
   */
  setCollapsed(collapsed) {
    this.userCollapsed_ = collapsed;
    if (!this.collapsible_ || this.collapsed_ === collapsed) {
      return;
    }
    this.handleToggle_();
  }

  /**
   * Return `true` when the attribution is currently collapsed or `false`
   * otherwise.
   * @return {boolean} True if the widget is collapsed.
   * @api
   */
  getCollapsed() {
    return this.collapsed_;
  }

  /**
   * Update the attribution element.
   * @param {import("../MapEvent.js").default} mapEvent Map event.
   * @override
   */
  render(mapEvent) {
    this.updateElement_(mapEvent.frameState);
  }
}

export default Attribution;
