import KML from '../src/ol/format/KML.js';
import Map from '../src/ol/Map.js';
import Stamen from '../src/ol/source/Stamen.js';
import VectorSource from '../src/ol/source/Vector.js';
import View from '../src/ol/View.js';
import {Fill, Stroke, Style} from '../src/ol/style.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';

/*
 * Compute the style of the feature.  Here we want the opacity of polygons to
 * be based on the offset from local noon.  For example, a timezone where it is
 * currently noon would have an opacity of 0.75.  And a timezone where it is
 * currently midnight would have an opacity of 0.  This doesn't account for
 * daylight savings, so don't use it to plan your vacation.
 */
const styleFunction = function (feature) {
  const tzOffset = feature.get('tz-offset');
  const local = new Date();
  local.setTime(
    local.getTime() + (local.getTimezoneOffset() + (tzOffset || 0)) * 60000
  );
  // offset from local noon (in hours)
  let delta = Math.abs(12 - (local.getHours() + local.getMinutes() / 60));
  if (delta > 12) {
    delta = 24 - delta;
  }
  const opacity = 0.75 * (1 - delta / 12);
  return new Style({
    fill: new Fill({
      color: [0xff, 0xff, 0x33, opacity],
    }),
    stroke: new Stroke({
      color: '#ffffff',
    }),
  });
};

const vector = new VectorLayer({
  source: new VectorSource({
    url: 'data/kml/timezones.kml',
    format: new KML({
      extractStyles: false,
    }),
  }),
  style: styleFunction,
});

/**
 * @param {string} name e.g. GMT -08:30
 * @return {number|null} The offset from UTC in minutes
 */
function parseOffsetFromUtc(name) {
  const match = name.match(/([+-]?)(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return sign * (60 * hours + minutes);
}

vector.getSource().on('featuresloadend', function (evt) {
  evt.features.forEach(function (feature) {
    const tzOffset = parseOffsetFromUtc(feature.get('name'));
    feature.set('tz-offset', tzOffset, true);
  });
});

const raster = new TileLayer({
  source: new Stamen({
    layer: 'toner',
  }),
});

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});

const info = $('#info');
info.tooltip({
  animation: false,
  trigger: 'manual',
});

const displayFeatureInfo = function (pixel) {
  info.css({
    left: pixel[0] + 'px',
    top: pixel[1] - 15 + 'px',
  });
  const feature = map.forEachFeatureAtPixel(pixel, function (feature) {
    return feature;
  });
  if (feature) {
    info.attr('data-original-title', feature.get('name')).tooltip('show');
  } else {
    info.tooltip('hide');
  }
};

map.on('pointermove', function (evt) {
  if (evt.dragging) {
    info.tooltip('hide');
    return;
  }
  displayFeatureInfo(map.getEventPixel(evt.originalEvent));
});

map.on('click', function (evt) {
  displayFeatureInfo(evt.pixel);
});
