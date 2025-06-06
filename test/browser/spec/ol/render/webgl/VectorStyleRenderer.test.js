import {spy as sinonSpy} from 'sinon';
import Feature from '../../../../../../src/ol/Feature.js';
import LineString from '../../../../../../src/ol/geom/LineString.js';
import Point from '../../../../../../src/ol/geom/Point.js';
import Polygon from '../../../../../../src/ol/geom/Polygon.js';
import MixedGeometryBatch from '../../../../../../src/ol/render/webgl/MixedGeometryBatch.js';
import {ShaderBuilder} from '../../../../../../src/ol/render/webgl/ShaderBuilder.js';
import VectorStyleRenderer from '../../../../../../src/ol/render/webgl/VectorStyleRenderer.js';
import {
  compose as composeTransform,
  create as createTransform,
  makeInverse as makeInverseTransform,
} from '../../../../../../src/ol/transform.js';
import WebGLArrayBuffer from '../../../../../../src/ol/webgl/Buffer.js';
import WebGLHelper from '../../../../../../src/ol/webgl/Helper.js';
import {
  ARRAY_BUFFER,
  DYNAMIC_DRAW,
  ELEMENT_ARRAY_BUFFER,
  FLOAT,
} from '../../../../../../src/ol/webgl.js';

/**
 * @type {import('../../../../../../src/ol/render/webgl/VectorStyleRenderer.js').AsShaders}
 */
const SAMPLE_SHADERS = () => ({
  builder: new ShaderBuilder()
    .setFillColorExpression('vec4(1.0)')
    .setStrokeColorExpression('vec4(1.0)')
    .setSymbolColorExpression('vec4(1.0)'),
  attributes: {
    prop_attr1: {
      callback: (feature) => feature.get('test'),
    },
    prop_attr2: {callback: () => [10, 20, 30], size: 3},
  },
  uniforms: {
    custom: () => 1234,
  },
});

/**
 * @type {import('../../../../../../src/ol/render/webgl/VectorStyleRenderer.js').AsRule}
 */
const SAMPLE_STYLE_RULE = {
  style: {
    'fill-color': ['get', 'color'],
    'stroke-width': 2,
    'circle-radius': ['get', 'size'],
    'circle-fill-color': 'red',
  },
  filter: ['>', ['get', 'size'], 10],
};

const SAMPLE_FRAMESTATE = {
  viewState: {
    center: [0, 10],
    resolution: 1,
    rotation: 0,
  },
  size: [10, 10],
};

const SAMPLE_TRANSFORM = composeTransform(
  createTransform(),
  0,
  0,
  0.5,
  0.25,
  0,
  -100,
  -200,
);

describe('VectorStyleRenderer', () => {
  let geometryBatch, helper, vectorStyleRenderer;
  beforeEach(() => {
    helper = new WebGLHelper();
    geometryBatch = new MixedGeometryBatch();
    geometryBatch.addFeatures([
      new Feature({
        test: 1000,
        geometry: new Point([10, 20]),
      }),
      new Feature({
        test: 2000,
        geometry: new Point([30, 40]),
      }),
      new Feature({
        test: 3000,
        geometry: new Polygon([
          [
            [10, 10],
            [20, 10],
            [20, 20],
            [10, 40],
            [10, 10],
          ],
        ]),
      }),
      new Feature({
        test: 4000,
        geometry: new LineString([
          [100, 200],
          [300, 400],
          [500, 600],
        ]),
      }),
    ]);
  });
  afterEach(() => {
    helper.dispose();
  });

  describe('constructor using style', () => {
    beforeEach(() => {
      vectorStyleRenderer = new VectorStyleRenderer(
        SAMPLE_STYLE_RULE,
        {},
        helper,
      );
    });
    it('creates a VectorStyleRenderer', () => {
      expect(vectorStyleRenderer.customAttributes_).to.eql({
        prop_color: {
          callback: {},
          size: 2,
        },
        prop_size: {
          callback: {},
          size: 1,
        },
      });
      expect(vectorStyleRenderer.uniforms_).to.eql({});
      expect(vectorStyleRenderer.fillProgram_).to.be.an(WebGLProgram);
      expect(vectorStyleRenderer.strokeProgram_).to.be.an(WebGLProgram);
      expect(vectorStyleRenderer.symbolProgram_).to.be.an(WebGLProgram);
      expect(vectorStyleRenderer.polygonAttributesDesc_).to.eql([
        {name: 'a_position', size: 2, type: FLOAT},
        {name: 'a_prop_size', size: 1, type: FLOAT},
        {name: 'a_prop_color', size: 2, type: FLOAT},
      ]);
      expect(vectorStyleRenderer.lineStringAttributesDesc_).to.eql([
        {name: 'a_segmentStart', size: 2, type: FLOAT},
        {name: 'a_measureStart', size: 1, type: FLOAT},
        {name: 'a_segmentEnd', size: 2, type: FLOAT},
        {name: 'a_measureEnd', size: 1, type: FLOAT},
        {name: 'a_joinAngles', size: 2, type: FLOAT},
        {name: 'a_distance', size: 1, type: FLOAT},
        {name: 'a_parameters', size: 1, type: FLOAT},
        {name: 'a_prop_size', size: 1, type: FLOAT},
        {name: 'a_prop_color', size: 2, type: FLOAT},
      ]);
      expect(vectorStyleRenderer.pointAttributesDesc_).to.eql([
        {name: 'a_position', size: 2, type: FLOAT},
        {name: 'a_index', size: 1, type: FLOAT},
        {name: 'a_prop_size', size: 1, type: FLOAT},
        {name: 'a_prop_color', size: 2, type: FLOAT},
      ]);
    });
  });
  describe('constructor using shaders', () => {
    beforeEach(() => {
      vectorStyleRenderer = new VectorStyleRenderer(
        SAMPLE_SHADERS(),
        {},
        helper,
      );
    });
    it('creates a VectorStyleRenderer', () => {
      expect(vectorStyleRenderer.customAttributes_).to.eql({
        prop_attr1: {
          callback: {},
        },
        prop_attr2: {
          callback: {},
          size: 3,
        },
      });
      expect(vectorStyleRenderer.uniforms_).to.eql({
        custom: {},
      });
      expect(vectorStyleRenderer.fillProgram_).to.be.an(WebGLProgram);
      expect(vectorStyleRenderer.strokeProgram_).to.be.an(WebGLProgram);
      expect(vectorStyleRenderer.symbolProgram_).to.be.an(WebGLProgram);
      expect(vectorStyleRenderer.polygonAttributesDesc_).to.eql([
        {name: 'a_position', size: 2, type: FLOAT},
        {name: 'a_prop_attr1', size: 1, type: FLOAT},
        {name: 'a_prop_attr2', size: 3, type: FLOAT},
      ]);
      expect(vectorStyleRenderer.lineStringAttributesDesc_).to.eql([
        {name: 'a_segmentStart', size: 2, type: FLOAT},
        {name: 'a_measureStart', size: 1, type: FLOAT},
        {name: 'a_segmentEnd', size: 2, type: FLOAT},
        {name: 'a_measureEnd', size: 1, type: FLOAT},
        {name: 'a_joinAngles', size: 2, type: FLOAT},
        {name: 'a_distance', size: 1, type: FLOAT},
        {name: 'a_parameters', size: 1, type: FLOAT},
        {name: 'a_prop_attr1', size: 1, type: FLOAT},
        {name: 'a_prop_attr2', size: 3, type: FLOAT},
      ]);
      expect(vectorStyleRenderer.pointAttributesDesc_).to.eql([
        {name: 'a_position', size: 2, type: FLOAT},
        {name: 'a_index', size: 1, type: FLOAT},
        {name: 'a_prop_attr1', size: 1, type: FLOAT},
        {name: 'a_prop_attr2', size: 3, type: FLOAT},
      ]);
    });
  });
  describe('methods', () => {
    beforeEach(() => {
      vectorStyleRenderer = new VectorStyleRenderer(
        SAMPLE_SHADERS(),
        {},
        helper,
      );
    });
    describe('generateBuffers', () => {
      let buffers;
      beforeEach(async () => {
        buffers = await vectorStyleRenderer.generateBuffers(
          geometryBatch,
          SAMPLE_TRANSFORM,
        );
      });
      it('creates buffers for a geometry batch', () => {
        expect(buffers.invertVerticesTransform).to.eql(
          makeInverseTransform(createTransform(), SAMPLE_TRANSFORM),
        );
        expect(buffers.polygonBuffers[0]).to.be.an(WebGLArrayBuffer);
        expect(buffers.polygonBuffers[0].getType()).to.be(ELEMENT_ARRAY_BUFFER);
        expect(buffers.polygonBuffers[0].getUsage()).to.be(DYNAMIC_DRAW);
        expect(buffers.polygonBuffers[1]).to.be.an(WebGLArrayBuffer);
        expect(buffers.polygonBuffers[1].getType()).to.be(ARRAY_BUFFER);
        expect(buffers.polygonBuffers[1].getUsage()).to.be(DYNAMIC_DRAW);
        expect(buffers.polygonBuffers[1].getArray().slice(0, 6)).to.eql([
          -45, -47.5, 3000, 10, 20, 30,
        ]);

        expect(buffers.lineStringBuffers[0]).to.be.an(WebGLArrayBuffer);
        expect(buffers.lineStringBuffers[0].getType()).to.be(
          ELEMENT_ARRAY_BUFFER,
        );
        expect(buffers.lineStringBuffers[0].getUsage()).to.be(DYNAMIC_DRAW);
        expect(buffers.lineStringBuffers[1]).to.be.an(WebGLArrayBuffer);
        expect(buffers.lineStringBuffers[1].getType()).to.be(ARRAY_BUFFER);
        expect(buffers.lineStringBuffers[1].getUsage()).to.be(DYNAMIC_DRAW);
        expect(buffers.lineStringBuffers[1].getArray().slice(0, 14)).to.eql([
          -45, -47.5, 0, -40, -47.5, 0, 1.5707963705062866, 4.71238899230957, 0,
          0, 3000, 10, 20, 30,
        ]);

        expect(buffers.pointBuffers[0]).to.be.an(WebGLArrayBuffer);
        expect(buffers.pointBuffers[0].getType()).to.be(ELEMENT_ARRAY_BUFFER);
        expect(buffers.pointBuffers[0].getUsage()).to.be(DYNAMIC_DRAW);
        expect(buffers.pointBuffers[1]).to.be.an(WebGLArrayBuffer);
        expect(buffers.pointBuffers[1].getType()).to.be(ARRAY_BUFFER);
        expect(buffers.pointBuffers[1].getUsage()).to.be(DYNAMIC_DRAW);
        expect(buffers.pointBuffers[1].getArray().slice(0, 7)).to.eql([
          -45, -45, 0, 1000, 10, 20, 30,
        ]);
      });
    });
    describe('render', () => {
      let buffers, preRenderCb;
      beforeEach(async () => {
        buffers = await vectorStyleRenderer.generateBuffers(
          geometryBatch,
          SAMPLE_TRANSFORM,
        );
        sinonSpy(helper, 'bindBuffer');
        sinonSpy(helper, 'enableAttributes');
        sinonSpy(helper, 'useProgram');
        sinonSpy(helper, 'drawElements');
        preRenderCb = sinonSpy();
        vectorStyleRenderer.render(buffers, SAMPLE_FRAMESTATE, preRenderCb);
      });
      it('uses programs for all geometry types', function () {
        expect(helper.useProgram.callCount).to.be(3);
        expect(helper.useProgram.firstCall.firstArg).to.be(
          vectorStyleRenderer.fillProgram_,
        );
        expect(helper.useProgram.secondCall.firstArg).to.be(
          vectorStyleRenderer.strokeProgram_,
        );
        expect(helper.useProgram.thirdCall.firstArg).to.be(
          vectorStyleRenderer.symbolProgram_,
        );
      });
      it('binds buffers for all geometry types', function () {
        expect(helper.bindBuffer.callCount).to.be(6);
        expect(helper.bindBuffer.calledWith(buffers.polygonBuffers[0])).to.be(
          true,
        );
        expect(helper.bindBuffer.calledWith(buffers.polygonBuffers[1])).to.be(
          true,
        );
        expect(
          helper.bindBuffer.calledWith(buffers.lineStringBuffers[0]),
        ).to.be(true);
        expect(
          helper.bindBuffer.calledWith(buffers.lineStringBuffers[1]),
        ).to.be(true);
        expect(helper.bindBuffer.calledWith(buffers.pointBuffers[0])).to.be(
          true,
        );
        expect(helper.bindBuffer.calledWith(buffers.pointBuffers[1])).to.be(
          true,
        );
      });
      it('enables attributes for all geometry types', function () {
        expect(helper.enableAttributes.callCount).to.be(3);
        expect(helper.enableAttributes.firstCall.firstArg).to.be(
          vectorStyleRenderer.polygonAttributesDesc_,
        );
        expect(helper.enableAttributes.secondCall.firstArg).to.be(
          vectorStyleRenderer.lineStringAttributesDesc_,
        );
        expect(helper.enableAttributes.thirdCall.firstArg).to.be(
          vectorStyleRenderer.pointAttributesDesc_,
        );
      });
      it('calls the pre render callback once per geometry type', function () {
        expect(preRenderCb.callCount).to.be(3);
      });
      it('renders all geometry types', function () {
        expect(helper.drawElements.callCount).to.be(3);
        expect(helper.drawElements.firstCall.args).to.eql([
          0,
          buffers.polygonBuffers[0].getSize(),
        ]);
        expect(helper.drawElements.secondCall.args).to.eql([
          0,
          buffers.lineStringBuffers[0].getSize(),
        ]);
        expect(helper.drawElements.thirdCall.args).to.eql([
          0,
          buffers.pointBuffers[0].getSize(),
        ]);
      });
    });
  });
  describe('rendering only fill', () => {
    let buffers, preRenderCb;
    beforeEach(async () => {
      const fillOnlyShaders = SAMPLE_SHADERS();
      fillOnlyShaders.builder = new ShaderBuilder().setFillColorExpression(
        'vec4(1.0)',
      );
      sinonSpy(helper, 'flushBufferData');
      sinonSpy(helper, 'enableAttributes');
      sinonSpy(helper, 'useProgram');
      sinonSpy(helper, 'drawElements');
      vectorStyleRenderer = new VectorStyleRenderer(
        fillOnlyShaders,
        {},
        helper,
      );
      buffers = await vectorStyleRenderer.generateBuffers(
        geometryBatch,
        SAMPLE_TRANSFORM,
      );
      preRenderCb = sinonSpy();
      vectorStyleRenderer.render(buffers, SAMPLE_FRAMESTATE, preRenderCb);
    });
    it('only loads buffer data for one geometry type', function () {
      expect(helper.flushBufferData.callCount).to.be(2);
    });
    it('only does one render', function () {
      expect(preRenderCb.callCount).to.be(1);
    });
    it('only does the polygon render pass', function () {
      expect(helper.enableAttributes.callCount).to.be(1);
      expect(helper.enableAttributes.firstCall.firstArg).to.be(
        vectorStyleRenderer.polygonAttributesDesc_,
      );
      expect(helper.useProgram.callCount).to.be(1);
      expect(helper.useProgram.firstCall.firstArg).to.be(
        vectorStyleRenderer.fillProgram_,
      );
      expect(helper.drawElements.callCount).to.be(1);
      expect(helper.drawElements.firstCall.args).to.eql([
        0,
        buffers.polygonBuffers[0].getSize(),
      ]);
    });
  });
  describe('rendering only stroke', () => {
    let buffers, preRenderCb;
    beforeEach(async () => {
      const strokeOnlyShaders = SAMPLE_SHADERS();
      strokeOnlyShaders.builder = new ShaderBuilder().setStrokeColorExpression(
        'vec4(1.0)',
      );
      sinonSpy(helper, 'flushBufferData');
      sinonSpy(helper, 'enableAttributes');
      sinonSpy(helper, 'useProgram');
      sinonSpy(helper, 'drawElements');
      vectorStyleRenderer = new VectorStyleRenderer(
        strokeOnlyShaders,
        {},
        helper,
      );
      buffers = await vectorStyleRenderer.generateBuffers(
        geometryBatch,
        SAMPLE_TRANSFORM,
      );
      preRenderCb = sinonSpy();
      vectorStyleRenderer.render(buffers, SAMPLE_FRAMESTATE, preRenderCb);
    });
    it('only loads buffer data for one geometry type', function () {
      expect(helper.flushBufferData.callCount).to.be(2);
    });
    it('only does one render', function () {
      expect(preRenderCb.callCount).to.be(1);
    });
    it('only does the line string render pass', function () {
      expect(helper.enableAttributes.callCount).to.be(1);
      expect(helper.enableAttributes.firstCall.firstArg).to.be(
        vectorStyleRenderer.lineStringAttributesDesc_,
      );
      expect(helper.useProgram.callCount).to.be(1);
      expect(helper.useProgram.firstCall.firstArg).to.be(
        vectorStyleRenderer.strokeProgram_,
      );
      expect(helper.drawElements.callCount).to.be(1);
      expect(helper.drawElements.firstCall.args).to.eql([
        0,
        buffers.lineStringBuffers[0].getSize(),
      ]);
    });
  });
  describe('rendering only symbol', () => {
    let buffers, preRenderCb;
    beforeEach(async () => {
      const symbolOnlyShaders = SAMPLE_SHADERS();
      symbolOnlyShaders.builder = new ShaderBuilder().setSymbolColorExpression(
        'vec4(1.)',
      );
      sinonSpy(helper, 'flushBufferData');
      sinonSpy(helper, 'enableAttributes');
      sinonSpy(helper, 'useProgram');
      sinonSpy(helper, 'drawElements');
      vectorStyleRenderer = new VectorStyleRenderer(
        symbolOnlyShaders,
        {},
        helper,
      );
      buffers = await vectorStyleRenderer.generateBuffers(
        geometryBatch,
        SAMPLE_TRANSFORM,
      );
      preRenderCb = sinonSpy();
      vectorStyleRenderer.render(buffers, SAMPLE_FRAMESTATE, preRenderCb);
    });
    it('only loads buffer data for one geometry type', function () {
      expect(helper.flushBufferData.callCount).to.be(2);
    });
    it('only does one render', function () {
      expect(preRenderCb.callCount).to.be(1);
    });
    it('only does the point render pass', function () {
      expect(helper.enableAttributes.callCount).to.be(1);
      expect(helper.enableAttributes.firstCall.firstArg).to.be(
        vectorStyleRenderer.pointAttributesDesc_,
      );
      expect(helper.useProgram.callCount).to.be(1);
      expect(helper.useProgram.firstCall.firstArg).to.be(
        vectorStyleRenderer.symbolProgram_,
      );
      expect(helper.drawElements.callCount).to.be(1);
      expect(helper.drawElements.firstCall.args).to.eql([
        0,
        buffers.pointBuffers[0].getSize(),
      ]);
    });
  });
  describe('applying a style filter', () => {
    let buffers;
    const style = {
      'fill-color': 'green',
      'stroke-width': 2,
      'circle-radius': 6,
    };
    describe('excluding only some objects', () => {
      beforeEach(async () => {
        const filter = ['<', ['get', 'test'], 2500];
        vectorStyleRenderer = new VectorStyleRenderer(
          {style, filter},
          {},
          helper,
          true,
          filter,
        );
        sinonSpy(geometryBatch, 'filter');
        buffers = await vectorStyleRenderer.generateBuffers(
          geometryBatch,
          SAMPLE_TRANSFORM,
        );
      });
      it('compiles filter to be run on CPU', () => {
        const filterFn = vectorStyleRenderer.featureFilter_;
        expect(filterFn(geometryBatch.getFeatureFromRef(1))).to.be(true);
        expect(filterFn(geometryBatch.getFeatureFromRef(2))).to.be(true);
        expect(filterFn(geometryBatch.getFeatureFromRef(3))).to.be(false);
        expect(filterFn(geometryBatch.getFeatureFromRef(4))).to.be(false);
      });
      it('applies filter and generates buffer', () => {
        expect(geometryBatch.filter.callCount).to.be(1);
        expect(buffers.pointBuffers).not.to.be(null);
        expect(buffers.lineStringBuffers).not.to.be(null);
        expect(buffers.polygonBuffers).not.to.be(null);
      });
    });
    describe('excluding all objects', () => {
      beforeEach(async () => {
        const filter = ['>', ['get', 'test'], 10000];
        vectorStyleRenderer = new VectorStyleRenderer(
          {style, filter},
          {},
          helper,
          true,
          filter,
        );
        sinonSpy(geometryBatch, 'filter');
        buffers = await vectorStyleRenderer.generateBuffers(
          geometryBatch,
          SAMPLE_TRANSFORM,
        );
      });
      it('applies filter and returns null', () => {
        expect(geometryBatch.filter.callCount).to.be(1);
        expect(buffers).to.be(null);
      });
    });
    describe('does not apply filter if it depends on map state', () => {
      beforeEach(async () => {
        const filter = ['>', ['zoom'], 2];
        vectorStyleRenderer = new VectorStyleRenderer(
          {style, filter},
          {},
          helper,
          true,
          filter,
        );
        sinonSpy(geometryBatch, 'filter');
        buffers = await vectorStyleRenderer.generateBuffers(
          geometryBatch,
          SAMPLE_TRANSFORM,
        );
      });
      it('does not filter the geometry batches', () => {
        expect(geometryBatch.filter.callCount).to.be(0);
      });
    });
    describe('does not apply filter if it cannot be compiled for CPU', () => {
      beforeEach(async () => {
        const filter = ['>', ['line-metric'], 10];
        vectorStyleRenderer = new VectorStyleRenderer(
          {style, filter},
          {},
          helper,
          true,
          filter,
        );
        sinonSpy(geometryBatch, 'filter');
        buffers = await vectorStyleRenderer.generateBuffers(
          geometryBatch,
          SAMPLE_TRANSFORM,
        );
      });
      it('does not filter the geometry batches', () => {
        expect(geometryBatch.filter.callCount).to.be(0);
      });
    });
  });
});
