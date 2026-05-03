import { useEffect, useRef, useState } from 'react';
import { mat4, quat, vec2, vec3 } from 'gl-matrix';
import './InfiniteMenu.css';

const discVertShaderSource = `#version 300 es

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

#define PI 3.141593

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);

    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}
`;

const discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
    int itemIndex = vInstanceId % uItemCount;
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

    ivec2 texSize = textureSize(uTex, 0);
    float imageAspect = float(texSize.x) / float(texSize.y);
    float containerAspect = 1.0;
    
    float scale = max(imageAspect / containerAspect, 
                     containerAspect / imageAspect);
    
    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = (st - 0.5) * scale + 0.5;
    
    st = clamp(st, 0.0, 1.0);
    
    st = st * cellSize + cellOffset;
    
    outColor = texture(uTex, st);
    outColor.a *= vAlpha;
}
`;

class Face {
  a: number;
  b: number;
  c: number;
  constructor(a: number, b: number, c: number) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
}

class Vertex {
  position: vec3;
  normal: vec3;
  uv: vec2;
  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

class Geometry {
  vertices: Vertex[] = [];
  faces: Face[] = [];

  addVertex(...args: number[]) {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  addFace(...args: number[]) {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  get lastVertex() {
    return this.vertices[this.vertices.length - 1];
  }

  subdivide(divisions = 1) {
    const midPointCache: Record<string, number> = {};
    let f = this.faces;

    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array(f.length * 4);

      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);

        const i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      });

      f = newFaces;
    }

    this.faces = f;
    return this;
  }

  spherize(radius = 1) {
    this.vertices.forEach(vertex => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get data() {
    return {
      vertices: this.vertexData,
      indices: this.indexData,
      normals: this.normalData,
      uvs: this.uvData
    };
  }

  get vertexData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.position)));
  }

  get normalData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.normal)));
  }

  get uvData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.uv)));
  }

  get indexData() {
    return new Uint16Array(this.faces.flatMap(f => [f.a, f.b, f.c]));
  }

  getMidPoint(ndxA: number, ndxB: number, cache: Record<string, number>) {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      return cache[cacheKey];
    }
    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return ndx;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1)
        .addFace(0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1);
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    steps = Math.max(4, steps);
    const alpha = (2 * Math.PI) / steps;
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;
    for (let i = 0; i < steps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;
      if (i > 0) this.addFace(0, i, i + 1);
    }
    this.addFace(0, steps, 1);
  }
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl: WebGL2RenderingContext, shaderSources: string[], transformFeedbackVaryings?: string[], attribLocations?: Record<string, number>) {
  const program = gl.createProgram()!;
  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
    const shader = createShader(gl, type, shaderSources[ndx]);
    if (shader) gl.attachShader(program, shader);
  });
  if (transformFeedbackVaryings) gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
  if (attribLocations) {
    for (const attrib in attribLocations) gl.bindAttribLocation(program, attribLocations[attrib], attrib);
  }
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function makeVertexArray(gl: WebGL2RenderingContext, bufLocNumElmPairs: [WebGLBuffer, number, number][], indices?: Uint16Array) {
  const va = gl.createVertexArray();
  gl.bindVertexArray(va);
  for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
    if (loc === -1) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }
  if (indices) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  return va;
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio);
  const displayWidth = Math.round(canvas.clientWidth * dpr);
  const displayHeight = Math.round(canvas.clientHeight * dpr);
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}

function makeBuffer(gl: WebGL2RenderingContext, sizeOrData: BufferSource | number, usage: number) {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  if (typeof sizeOrData === 'number') gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
  else gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

function createAndSetupTexture(gl: WebGL2RenderingContext, minFilter: number, magFilter: number, wrapS: number, wrapT: number) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  return texture;
}

class ArcballControl {
  isPointerDown = false;
  orientation = quat.create();
  pointerRotation = quat.create();
  rotationVelocity = 0;
  rotationAxis = vec3.fromValues(1, 0, 0);
  snapDirection = vec3.fromValues(0, 0, -1);
  snapTargetDirection: vec3 | undefined;
  EPSILON = 0.1;
  IDENTITY_QUAT = quat.create();
  
  canvas: HTMLCanvasElement;
  updateCallback: (deltaTime: number) => void;
  pointerPos = vec2.create();
  previousPointerPos = vec2.create();
  _rotationVelocity = 0;
  _combinedQuat = quat.create();

  constructor(canvas: HTMLCanvasElement, updateCallback?: (deltaTime: number) => void) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || (() => null);

    canvas.addEventListener('pointerdown', e => {
      vec2.set(this.pointerPos, e.clientX, e.clientY);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
    });
    canvas.addEventListener('pointerup', () => this.isPointerDown = false);
    canvas.addEventListener('pointerleave', () => this.isPointerDown = false);
    canvas.addEventListener('pointermove', e => {
      if (this.isPointerDown) vec2.set(this.pointerPos, e.clientX, e.clientY);
    });
    canvas.style.touchAction = 'none';
  }

  update(deltaTime: number, targetFrameDuration = 16) {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    let snapRotation = quat.create();

    if (this.isPointerDown) {
      const INTENSITY = 0.3 * timeScale;
      const ANGLE_AMPLIFICATION = 5 / timeScale;
      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);

      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        const p = this.#project(midPointerPos);
        const q = this.#project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        angleFactor *= ANGLE_AMPLIFICATION;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      const INTENSITY = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2;
        const sqrDist = vec3.squaredDistance(this.snapTargetDirection, this.snapDirection);
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(this.snapTargetDirection, this.snapDirection, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    const RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(this._combinedQuat[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }

    const RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;
    this.updateCallback(deltaTime);
  }

  quatFromVectors(a: vec3, b: vec3, out: quat, angleFactor = 1) {
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    const angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
    return { q: out, axis, angle };
  }

  #project(pos: vec2) {
    const r = 2;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const s = Math.max(w, h) - 1;
    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;
    if (xySq <= rSq / 2.0) z = Math.sqrt(rSq - xySq);
    else z = rSq / Math.sqrt(xySq);
    return vec3.fromValues(-x, y, z);
  }
}

class InfiniteGridMenu {
  TARGET_FRAME_DURATION = 1000 / 60;
  SPHERE_RADIUS = 2;

  #time = 0;
  #deltaTime = 0;
  #deltaFrames = 0;
  #frames = 0;

  camera = {
    matrix: mat4.create(),
    near: 0.1,
    far: 40,
    fov: Math.PI / 4,
    aspect: 1,
    position: vec3.fromValues(0, 0, 3),
    up: vec3.fromValues(0, 1, 0),
    matrices: {
      view: mat4.create(),
      projection: mat4.create(),
      inversProjection: mat4.create()
    }
  };

  nearestVertexIndex: number | null = null;
  smoothRotationVelocity = 0;
  scaleFactor = 1.0;
  movementActive = false;
  
  canvas: HTMLCanvasElement;
  items: any[];
  onActiveItemChange: (index: number) => void;
  onMovementChange: (active: boolean) => void;
  gl: WebGL2RenderingContext | null = null;
  viewportSize: vec2 = vec2.create();
  drawBufferSize: vec2 = vec2.create();
  discProgram: WebGLProgram | null = null;
  discLocations: any = {};
  discGeo: DiscGeometry | null = null;
  discBuffers: any = null;
  discVAO: WebGLVertexArrayObject | null = null;
  icoGeo: IcosahedronGeometry | null = null;
  instancePositions: vec3[] = [];
  DISC_INSTANCE_COUNT = 0;
  discInstances: any = null;
  worldMatrix = mat4.create();
  tex: WebGLTexture | null = null;
  atlasSize = 1;
  control: ArcballControl | null = null;
  animationId = 0;

  constructor(canvas: HTMLCanvasElement, items: any[], onActiveItemChange: any, onMovementChange: any, onInit: any, scale = 1.0) {
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || (() => {});
    this.onMovementChange = onMovementChange || (() => {});
    this.scaleFactor = scale;
    this.camera.position[2] = 3 * scale;
    this.#init(onInit);
  }

  resize() {
    if (!this.gl) return;
    resizeCanvasToDisplaySize(this.canvas);
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.#updateProjectionMatrix(this.gl);
  }

  run(time = 0) {
    this.#deltaTime = Math.min(32, time - this.#time);
    this.#time = time;
    this.#deltaFrames = this.#deltaTime / this.TARGET_FRAME_DURATION;
    this.#frames += this.#deltaFrames;
    this.#animate(this.#deltaTime);
    this.#render();
    this.animationId = requestAnimationFrame(t => this.run(t));
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  #init(onInit: any) {
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!this.gl) throw new Error('No WebGL 2 context!');
    
    this.discProgram = createProgram(this.gl, [discVertShaderSource, discFragShaderSource], undefined, {
      aModelPosition: 0, aModelUvs: 2, aInstanceMatrix: 3
    });
    if (!this.discProgram) return;

    this.discLocations = {
      uWorldMatrix: this.gl.getUniformLocation(this.discProgram, 'uWorldMatrix'),
      uViewMatrix: this.gl.getUniformLocation(this.discProgram, 'uViewMatrix'),
      uProjectionMatrix: this.gl.getUniformLocation(this.discProgram, 'uProjectionMatrix'),
      uCameraPosition: this.gl.getUniformLocation(this.discProgram, 'uCameraPosition'),
      uRotationAxisVelocity: this.gl.getUniformLocation(this.discProgram, 'uRotationAxisVelocity'),
      uTex: this.gl.getUniformLocation(this.discProgram, 'uTex'),
      uItemCount: this.gl.getUniformLocation(this.discProgram, 'uItemCount'),
      uAtlasSize: this.gl.getUniformLocation(this.discProgram, 'uAtlasSize')
    };

    this.discGeo = new DiscGeometry(56, 1);
    this.discBuffers = this.discGeo.data;
    this.discVAO = makeVertexArray(this.gl, [
      [makeBuffer(this.gl, this.discBuffers.vertices, this.gl.STATIC_DRAW), 0, 3],
      [makeBuffer(this.gl, this.discBuffers.uvs, this.gl.STATIC_DRAW), 2, 2]
    ], this.discBuffers.indices);

    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map(v => v.position);
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;
    this.#initDiscInstances(this.DISC_INSTANCE_COUNT);
    this.#initTexture();

    this.control = new ArcballControl(this.canvas, deltaTime => this.#onControlUpdate(deltaTime));
    this.#updateCameraMatrix();
    this.#updateProjectionMatrix(this.gl);
    if (onInit) onInit(this);
  }

  #initTexture() {
    if (!this.gl) return;
    this.tex = createAndSetupTexture(this.gl, this.gl.LINEAR, this.gl.LINEAR, this.gl.CLAMP_TO_EDGE, this.gl.CLAMP_TO_EDGE);
    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const cellSize = 512;
    canvas.width = canvas.height = this.atlasSize * cellSize;

    Promise.all(this.items.map(item => new Promise(resolve => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const c = document.createElement('canvas'); c.width = c.height = 10;
        const ctx2 = c.getContext('2d')!; ctx2.fillStyle = '#1e293b'; ctx2.fillRect(0,0,10,10);
        resolve(c);
      };
      img.src = item.image;
    }))).then(images => {
      images.forEach((img: any, i) => {
        const x = (i % this.atlasSize) * cellSize, y = Math.floor(i / this.atlasSize) * cellSize;
        ctx.save(); ctx.beginPath();
        ctx.arc(x + cellSize/2, y + cellSize/2, cellSize/2, 0, Math.PI * 2);
        ctx.clip(); ctx.drawImage(img, x, y, cellSize, cellSize); ctx.restore();
      });
      this.gl!.bindTexture(this.gl!.TEXTURE_2D, this.tex);
      this.gl!.texImage2D(this.gl!.TEXTURE_2D, 0, this.gl!.RGBA, this.gl!.RGBA, this.gl!.UNSIGNED_BYTE, canvas);
      this.gl!.generateMipmap(this.gl!.TEXTURE_2D);
    });
  }

  #initDiscInstances(count: number) {
    if (!this.gl) return;
    this.discInstances = { matricesArray: new Float32Array(count * 16), matrices: [], buffer: this.gl.createBuffer() };
    for (let i = 0; i < count; ++i) {
      this.discInstances.matrices.push(new Float32Array(this.discInstances.matricesArray.buffer, i * 16 * 4, 16));
    }
    this.gl.bindVertexArray(this.discVAO);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.discInstances.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, this.gl.DYNAMIC_DRAW);
    for (let j = 0; j < 4; ++j) {
      this.gl.enableVertexAttribArray(3 + j);
      this.gl.vertexAttribPointer(3 + j, 4, this.gl.FLOAT, false, 16 * 4, j * 4 * 4);
      this.gl.vertexAttribDivisor(3 + j, 1);
    }
  }

  #animate(deltaTime: number) {
    if (!this.gl || !this.control) return;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);
    const scale = 0.25;
    this.instancePositions.forEach((p, ndx) => {
      const worldP = vec3.transformQuat(vec3.create(), p, this.control!.orientation);
      const s = (Math.abs(worldP[2]) / this.SPHERE_RADIUS) * 0.6 + 0.4;
      const matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), worldP)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], worldP, [0, 1, 0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [s * scale, s * scale, s * scale]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));
      mat4.copy(this.discInstances.matrices[ndx], matrix);
    });
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.discInstances.buffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  #render() {
    if (!this.gl || !this.discProgram) return;
    this.gl.useProgram(this.discProgram);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    this.gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    this.gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    this.gl.uniform3fv(this.discLocations.uCameraPosition, this.camera.position);
    this.gl.uniform4f(this.discLocations.uRotationAxisVelocity, this.control!.rotationAxis[0], this.control!.rotationAxis[1], this.control!.rotationAxis[2], this.smoothRotationVelocity * 1.1);
    this.gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    this.gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex);
    this.gl.bindVertexArray(this.discVAO);
    this.gl.drawElementsInstanced(this.gl.TRIANGLES, this.discBuffers.indices.length, this.gl.UNSIGNED_SHORT, 0, this.DISC_INSTANCE_COUNT);
  }

  #updateCameraMatrix() {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  #updateProjectionMatrix(gl: WebGL2RenderingContext) {
    const canvas = gl.canvas;
    let width = 0;
    let height = 0;
    
    if (canvas instanceof HTMLCanvasElement) {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
    } else {
      width = canvas.width;
      height = canvas.height;
    }
    
    const aspect = (width || 1) / (height || 1);
    this.camera.fov = 2 * Math.atan((this.SPHERE_RADIUS * 0.35) / (aspect > 1 ? 1 : aspect) / this.camera.position[2]);
    mat4.perspective(this.camera.matrices.projection, this.camera.fov, aspect, 0.1, 40);
  }

  #onControlUpdate(deltaTime: number) {
    if (!this.control) return;
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    const isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;
    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }
    if (!this.control.isPointerDown) {
      const invOrient = quat.conjugate(quat.create(), this.control.orientation);
      const nt = vec3.transformQuat(vec3.create(), this.control.snapDirection, invOrient);
      let maxD = -1, nearest = 0;
      this.instancePositions.forEach((p, i) => { const d = vec3.dot(nt, p); if (d > maxD) { maxD = d; nearest = i; } });
      this.onActiveItemChange(nearest % Math.max(1, this.items.length));
      this.control.snapTargetDirection = vec3.normalize(vec3.create(), vec3.transformQuat(vec3.create(), this.instancePositions[nearest], this.control!.orientation));
    }
    this.camera.position[2] += (3 * this.scaleFactor + (this.control.isPointerDown ? this.control.rotationVelocity * 80 + 2.5 : 0) - this.camera.position[2]) / (this.control.isPointerDown ? 7 : 5 / timeScale);
    this.#updateCameraMatrix();
  }
}

export default function InfiniteMenu({ items = [], scale = 1.0, onOpenItem }: { items?: any[], scale?: number, onOpenItem?: (item: any) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !items.length) return;
    const sketch = new InfiniteGridMenu(canvasRef.current, items, (idx) => setActiveItem(items[idx]), setIsMoving, (sk: any) => sk.run(), scale);
    const handleResize = () => sketch.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); sketch.stop(); };
  }, [items, scale]);

  return (
    <div className="infinite-menu-container">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {activeItem && (
        <div className={`active-item-info content-center text-center pointer-events-none transition-all duration-500 ${isMoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="inline-flex flex-col items-center max-w-sm px-6">
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{activeItem.title}</h2>
            <p className="text-sm md:text-base text-white/70 font-medium tracking-wide drop-shadow-md mb-8">{activeItem.description}</p>
            <button onClick={() => onOpenItem?.(activeItem)} className="pointer-events-auto w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-400 hover:scale-110 transition-all shadow-xl"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="3" fill="none"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></button>
          </div>
        </div>
      )}
    </div>
  );
}
