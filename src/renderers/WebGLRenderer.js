import Face3 from "../core/Face3";
import Face4 from "../core/Face4";
import Matrix4 from "../core/Matrix4";
import AmbientLight from "../lights/AmbientLight";
import DirectionalLight from "../lights/DirectionalLight";
import PointLight from "../lights/PointLight";
import { AdditiveBlending, GouraudShading, NormalBlending, PhongShading, SubtractiveBlending } from "../materials/Material";
import MeshBasicMaterial from "../materials/MeshBasicMaterial";
import MeshDepthMaterial from "../materials/MeshDepthMaterial";
import MeshFaceMaterial from "../materials/MeshFaceMaterial";
import MeshLambertMaterial from "../materials/MeshLambertMaterial";
import MeshNormalMaterial from "../materials/MeshNormalMaterial";
import MeshPhongMaterial from "../materials/MeshPhongMaterial";
import Mesh from "../objects/Mesh";


const BASIC = 0, LAMBERT = 1, PHONG = 2, DEPTH = 3, NORMAL = 4 // material constants used in shader

export default class WebGLRenderer {
	_canvas = document.createElement('canvas')
	domElement
	autoClear = true

	maxLightCount

	_modelViewMatrix = new Matrix4()
	_normalMatrix
	_gl
	_program

	constructor(scene) {
		this.scene = scene
		this.domElement = this._canvas
		this.maxLightCount = this.allocateLights(scene, 5);

		this.initGL()
		this.initProgram(this.maxLightCount.directional, this.maxLightCount.point)
	}

	allocateLights(scene, maxLights) {
		if (scene) {

			var dirLights = 0, pointLights = 0, maxDirLights = 0, maxPointLights = 0;

			scene.lights.forEach(light => {
				if (light instanceof DirectionalLight) dirLights++;
				if (light instanceof PointLight) pointLights++;
			})

			if ((pointLights + dirLights) <= maxLights) {

				maxDirLights = dirLights;
				maxPointLights = pointLights;

			} else {

				maxDirLights = Math.ceil(maxLights * dirLights / (pointLights + dirLights));
				maxPointLights = maxLights - maxDirLights;

			}

			return { 'directional': maxDirLights, 'point': maxPointLights };

		}

		return { 'directional': 1, 'point': maxLights - 1 };
	}

	setSize(width, height) {

		this._canvas.width = width;
		this._canvas.height = height;
		this._gl.viewport(0, 0, this._canvas.width, this._canvas.height);

	}

	clear() {
		let _gl = this._gl
		_gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
	}

	setupLights(scene) {
		let _gl = this._gl
		let _program = this._program

		var r, g, b,
			ambientLights = [], 
			pointLights = [], 
			directionalLights = [],
			colors = [], 
			positions = [];

		_gl.uniform1i(_program.enableLighting, scene.lights.length);

		scene.lights.forEach(light => {

			if (light instanceof AmbientLight) {

				ambientLights.push(light);

			} else if (light instanceof DirectionalLight) {

				directionalLights.push(light);

			} else if (light instanceof PointLight) {

				pointLights.push(light);

			}

		});

		// sum all ambient lights
		r = g = b = 0.0;

		ambientLights.forEach(light => {
			r += light.color.r;
			g += light.color.g;
			b += light.color.b;
		})

		_gl.uniform3f(_program.ambientLightColor, r, g, b);

		// pass directional lights as float arrays

		colors = []; positions = [];

		directionalLights.forEach(light => {

			colors.push(light.color.r * light.intensity);
			colors.push(light.color.g * light.intensity);
			colors.push(light.color.b * light.intensity);

			positions.push(light.position.x);
			positions.push(light.position.y);
			positions.push(light.position.z);

		})

		if (directionalLights.length) {

			_gl.uniform1i(_program.directionalLightNumber, directionalLights.length);
			_gl.uniform3fv(_program.directionalLightDirection, positions);
			_gl.uniform3fv(_program.directionalLightColor, colors);

		}

		// pass point lights as float arrays

		colors = []; positions = [];

		pointLights.forEach(light => {

			colors.push(light.color.r * light.intensity);
			colors.push(light.color.g * light.intensity);
			colors.push(light.color.b * light.intensity);

			positions.push(light.position.x);
			positions.push(light.position.y);
			positions.push(light.position.z);

		})

		if (pointLights.length) {

			_gl.uniform1i(_program.pointLightNumber, pointLights.length);
			_gl.uniform3fv(_program.pointLightPosition, positions);
			_gl.uniform3fv(_program.pointLightColor, colors);

		}
	}

	createBuffers(object, mf) {
		const _gl = this._gl
		const materialFaceGroup = object.materialFaceGroup[mf]

		let faceArray = [],
			lineArray = [],

			vertexArray = [],
			normalArray = [],
			uvArray = [],

			vertexIndex = 0,

			useSmoothNormals = false;

		// need to find out if there is any material in the object
		// (among all mesh materials and also face materials)
		// which would need smooth normals

		function needsSmoothNormals(material) {

			return material.shading != undefined && (material.shading == GouraudShading || material.shading == PhongShading);

		}

		object.material.forEach(meshMaterial => {
			if (meshMaterial instanceof MeshFaceMaterial) {

				materialFaceGroup.material.forEach(material => {
					if (needsSmoothNormals(material)) {

						useSmoothNormals = true;

					}
				})

			} else {

				if (needsSmoothNormals(meshMaterial)) {

					useSmoothNormals = true;

				}

			}

		})

		materialFaceGroup.faces.forEach(fi => {

			let face = object.geometry.faces[fi];
			let vertexNormals = face.vertexNormals;
			let normal = face.normal;
			let uv = object.geometry.uvs[fi];

			if (face instanceof Face3) {

				const v1 = object.geometry.vertices[face.a].position;
				const v2 = object.geometry.vertices[face.b].position;
				const v3 = object.geometry.vertices[face.c].position;

				vertexArray.push(v1.x, v1.y, v1.z);
				vertexArray.push(v2.x, v2.y, v2.z);
				vertexArray.push(v3.x, v3.y, v3.z);

				if (vertexNormals.length == 3 && useSmoothNormals) {

					normalArray.push(vertexNormals[0].x, vertexNormals[0].y, vertexNormals[0].z);
					normalArray.push(vertexNormals[1].x, vertexNormals[1].y, vertexNormals[1].z);
					normalArray.push(vertexNormals[2].x, vertexNormals[2].y, vertexNormals[2].z);

				} else {

					normalArray.push(normal.x, normal.y, normal.z);
					normalArray.push(normal.x, normal.y, normal.z);
					normalArray.push(normal.x, normal.y, normal.z);

				}

				if (uv) {

					uvArray.push(uv[0].u, uv[0].v);
					uvArray.push(uv[1].u, uv[1].v);
					uvArray.push(uv[2].u, uv[2].v);

				}

				faceArray.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);

				// TODO: don't add lines that already exist (faces sharing edge)

				lineArray.push(vertexIndex, vertexIndex + 1);
				lineArray.push(vertexIndex, vertexIndex + 2);
				lineArray.push(vertexIndex + 1, vertexIndex + 2);

				vertexIndex += 3;

			} else if (face instanceof Face4) {

				const v1 = object.geometry.vertices[face.a].position;
				const v2 = object.geometry.vertices[face.b].position;
				const v3 = object.geometry.vertices[face.c].position;
				const v4 = object.geometry.vertices[face.d].position;

				vertexArray.push(v1.x, v1.y, v1.z);
				vertexArray.push(v2.x, v2.y, v2.z);
				vertexArray.push(v3.x, v3.y, v3.z);
				vertexArray.push(v4.x, v4.y, v4.z);

				if (vertexNormals.length == 4 && useSmoothNormals) {

					normalArray.push(vertexNormals[0].x, vertexNormals[0].y, vertexNormals[0].z);
					normalArray.push(vertexNormals[1].x, vertexNormals[1].y, vertexNormals[1].z);
					normalArray.push(vertexNormals[2].x, vertexNormals[2].y, vertexNormals[2].z);
					normalArray.push(vertexNormals[3].x, vertexNormals[3].y, vertexNormals[3].z);

				} else {

					normalArray.push(normal.x, normal.y, normal.z);
					normalArray.push(normal.x, normal.y, normal.z);
					normalArray.push(normal.x, normal.y, normal.z);
					normalArray.push(normal.x, normal.y, normal.z);

				}

				if (uv) {

					uvArray.push(uv[0].u, uv[0].v);
					uvArray.push(uv[1].u, uv[1].v);
					uvArray.push(uv[2].u, uv[2].v);
					uvArray.push(uv[3].u, uv[3].v);

				}

				faceArray.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
				faceArray.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);

				// TODO: don't add lines that already exist (faces sharing edge)

				lineArray.push(vertexIndex, vertexIndex + 1);
				lineArray.push(vertexIndex, vertexIndex + 2);
				lineArray.push(vertexIndex, vertexIndex + 3);
				lineArray.push(vertexIndex + 1, vertexIndex + 2);
				lineArray.push(vertexIndex + 2, vertexIndex + 3);

				vertexIndex += 4;

			}
		})

		if (!vertexArray.length) {

			return;

		}

		materialFaceGroup.__webGLVertexBuffer = _gl.createBuffer();
		_gl.bindBuffer(_gl.ARRAY_BUFFER, materialFaceGroup.__webGLVertexBuffer);
		_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(vertexArray), _gl.STATIC_DRAW);

		materialFaceGroup.__webGLNormalBuffer = _gl.createBuffer();
		_gl.bindBuffer(_gl.ARRAY_BUFFER, materialFaceGroup.__webGLNormalBuffer);
		_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(normalArray), _gl.STATIC_DRAW);

		materialFaceGroup.__webGLUVBuffer = _gl.createBuffer();
		_gl.bindBuffer(_gl.ARRAY_BUFFER, materialFaceGroup.__webGLUVBuffer);
		_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(uvArray), _gl.STATIC_DRAW);

		materialFaceGroup.__webGLFaceBuffer = _gl.createBuffer();
		_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, materialFaceGroup.__webGLFaceBuffer);
		_gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faceArray), _gl.STATIC_DRAW);

		materialFaceGroup.__webGLLineBuffer = _gl.createBuffer();
		_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, materialFaceGroup.__webGLLineBuffer);
		_gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineArray), _gl.STATIC_DRAW);

		materialFaceGroup.__webGLFaceCount = faceArray.length;
		materialFaceGroup.__webGLLineCount = lineArray.length;
	}

	renderBuffer(material, materialFaceGroup) {
		let _gl = this._gl
		let _program = this._program
		let mColor, mOpacity, mLineWidth, mWireframe, mBlending, mMap, mAmbient, mSpecular, mShininess

		if (material instanceof MeshPhongMaterial ||
			material instanceof MeshLambertMaterial ||
			material instanceof MeshBasicMaterial) {

			mColor = material.color;
			mOpacity = material.opacity;

			mWireframe = material.wireframe;
			mLineWidth = material.wireframe_linewidth;

			mBlending = material.blending;

			mMap = material.map;

			_gl.uniform4f(_program.mColor, mColor.r * mOpacity, mColor.g * mOpacity, mColor.b * mOpacity, mOpacity);

		}

		if (material instanceof MeshNormalMaterial) {

			mOpacity = material.opacity;
			mBlending = material.blending;

			_gl.uniform1f(_program.mOpacity, mOpacity);

			_gl.uniform1i(_program.material, NORMAL);

		} else if (material instanceof MeshDepthMaterial) {

			mOpacity = material.opacity;

			mWireframe = material.wireframe;
			mLineWidth = material.wireframe_linewidth;

			_gl.uniform1f(_program.mOpacity, mOpacity);

			_gl.uniform1f(_program.m2Near, material.__2near);
			_gl.uniform1f(_program.mFarPlusNear, material.__farPlusNear);
			_gl.uniform1f(_program.mFarMinusNear, material.__farMinusNear);

			_gl.uniform1i(_program.material, DEPTH);

		} else if (material instanceof MeshPhongMaterial) {

			mAmbient = material.ambient;
			mSpecular = material.specular;
			mShininess = material.shininess;

			_gl.uniform4f(_program.mAmbient, mAmbient.r, mAmbient.g, mAmbient.b, mOpacity);
			_gl.uniform4f(_program.mSpecular, mSpecular.r, mSpecular.g, mSpecular.b, mOpacity);
			_gl.uniform1f(_program.mShininess, mShininess);

			_gl.uniform1i(_program.material, PHONG);

		} else if (material instanceof MeshLambertMaterial) {

			_gl.uniform1i(_program.material, LAMBERT);

		} else if (material instanceof MeshBasicMaterial) {

			_gl.uniform1i(_program.material, BASIC);

		}

		if (mMap) {

			if (!material.__webGLTexture && material.map.loaded) {

				material.__webGLTexture = _gl.createTexture();
				_gl.bindTexture(_gl.TEXTURE_2D, material.__webGLTexture);
				_gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, material.map.image);
				_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
				_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR_MIPMAP_LINEAR);
				_gl.generateMipmap(_gl.TEXTURE_2D);
				_gl.bindTexture(_gl.TEXTURE_2D, null);

			}

			_gl.activeTexture(_gl.TEXTURE0);
			_gl.bindTexture(_gl.TEXTURE_2D, material.__webGLTexture);
			_gl.uniform1i(_program.tMap, 0);

			_gl.uniform1i(_program.enableMap, 1);

		} else {

			_gl.uniform1i(_program.enableMap, 0);

		}


		// vertices

		_gl.bindBuffer(_gl.ARRAY_BUFFER, materialFaceGroup.__webGLVertexBuffer);
		_gl.vertexAttribPointer(_program.position, 3, _gl.FLOAT, false, 0, 0);

		// normals

		_gl.bindBuffer(_gl.ARRAY_BUFFER, materialFaceGroup.__webGLNormalBuffer);
		_gl.vertexAttribPointer(_program.normal, 3, _gl.FLOAT, false, 0, 0);

		// uvs

		if (mMap) {

			_gl.bindBuffer(_gl.ARRAY_BUFFER, materialFaceGroup.__webGLUVBuffer);

			_gl.enableVertexAttribArray(_program.uv);
			_gl.vertexAttribPointer(_program.uv, 2, _gl.FLOAT, false, 0, 0);

		} else {

			_gl.disableVertexAttribArray(_program.uv);

		}

		// render triangles

		if (!mWireframe) {

			_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, materialFaceGroup.__webGLFaceBuffer);
			_gl.drawElements(_gl.TRIANGLES, materialFaceGroup.__webGLFaceCount, _gl.UNSIGNED_SHORT, 0);

			// render lines

		} else {

			_gl.lineWidth(mLineWidth);
			_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, materialFaceGroup.__webGLLineBuffer);
			_gl.drawElements(_gl.LINES, materialFaceGroup.__webGLLineCount, _gl.UNSIGNED_SHORT, 0);

		}
	}

	renderPass(object, materialFaceGroup, blending) {
		
		object.material.forEach(meshMaterial => {
			if (meshMaterial instanceof MeshFaceMaterial) {

				materialFaceGroup.material.forEach(material => {
					if (material.blending == blending) {

						this.setBlending(material.blending);
						this.renderBuffer(material, materialFaceGroup);

					}
				})

			} else {

				let material = meshMaterial;
				if (material.blending == blending) {

					this.setBlending(material.blending);
					this.renderBuffer(material, materialFaceGroup);
				}

			}
		})

	}

	setupMatrices(object, camera) {

		let _gl = this._gl
		let _program = this._program
		let _modelViewMatrix = this._modelViewMatrix
		let _normalMatrix = this._normalMatrix

		object.autoUpdateMatrix && object.updateMatrix();

		_modelViewMatrix.multiply(camera.matrix, object.matrix);

		_program.viewMatrixArray = new Float32Array(camera.matrix.flatten());
		_program.modelViewMatrixArray = new Float32Array(_modelViewMatrix.flatten());
		_program.projectionMatrixArray = new Float32Array(camera.projectionMatrix.flatten());

		_normalMatrix = Matrix4.makeInvert3x3(_modelViewMatrix).transpose();
		_program.normalMatrixArray = new Float32Array(_normalMatrix.m);

		_gl.uniformMatrix4fv(_program.viewMatrix, false, _program.viewMatrixArray);
		_gl.uniformMatrix4fv(_program.modelViewMatrix, false, _program.modelViewMatrixArray);
		_gl.uniformMatrix4fv(_program.projectionMatrix, false, _program.projectionMatrixArray);
		_gl.uniformMatrix3fv(_program.normalMatrix, false, _program.normalMatrixArray);
		_gl.uniformMatrix4fv(_program.objMatrix, false, new Float32Array(object.matrix.flatten()));
	}

	setBlending(blending) {
		let _gl = this._gl

		switch (blending) {

			case AdditiveBlending:

				_gl.blendEquation(_gl.FUNC_ADD);
				_gl.blendFunc(_gl.ONE, _gl.ONE);

				break;

			case SubtractiveBlending:

				//_gl.blendEquation( _gl.FUNC_SUBTRACT );
				_gl.blendFunc(_gl.DST_COLOR, _gl.ZERO);

				break;

			default:

				_gl.blendEquation(_gl.FUNC_ADD);
				_gl.blendFunc(_gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);

				break;
		}
	}

	setFaceCulling(cullFace, frontFace) {
		let _gl = this._gl

		if (cullFace) {

			if (!frontFace || frontFace == "ccw") {

				_gl.frontFace(_gl.CCW);

			} else {

				_gl.frontFace(_gl.CW);
			}

			if (cullFace == "back") {

				_gl.cullFace(_gl.BACK);

			} else if (cullFace == "front") {

				_gl.cullFace(_gl.FRONT);

			} else {

				_gl.cullFace(_gl.FRONT_AND_BACK);
			}

			_gl.enable(_gl.CULL_FACE);

		} else {

			_gl.disable(_gl.CULL_FACE);
		}
	}

	render(scene, camera) {

		let _gl = this._gl
		let _program = this._program

		this.initWebGLObjects(scene);

		if (this.autoClear) {

			this.clear();

		}

		camera.autoUpdateMatrix && camera.updateMatrix();
		_gl.uniform3f(_program.cameraPosition, camera.position.x, camera.position.y, camera.position.z);

		this.setupLights(scene);

		// opaque pass

		scene.__webGLObjects.forEach(webGLObject => {
			this.setupMatrices(webGLObject.__object, camera);
			this.renderPass(webGLObject.__object, webGLObject, NormalBlending);
		})

		// transparent pass

		scene.__webGLObjects.forEach(webGLObject => {
			this.setupMatrices(webGLObject.__object, camera);
			this.renderPass(webGLObject.__object, webGLObject, AdditiveBlending);
			this.renderPass(webGLObject.__object, webGLObject, SubtractiveBlending);
		})

	}

	initWebGLObjects(scene) {
		if (!scene.__webGLObjects) {

			scene.__webGLObjects = [];

		}

		scene.objects.forEach(object => {
			if (object instanceof Mesh) {

				// create separate VBOs per material

				for (let mf in object.materialFaceGroup) {

					const materialFaceGroup = object.materialFaceGroup[mf];

					// initialise buffers on the first access

					if (!materialFaceGroup.__webGLVertexBuffer) {

						this.createBuffers(object, mf);
						materialFaceGroup.__object = object;
						scene.__webGLObjects.push(materialFaceGroup);

					}

				}

			}
		})
	}

	initGL() {
		let _gl
		try {

			_gl = this._canvas.getContext('experimental-webgl', { antialias: true });

		} catch (e) { }

		if (!_gl) {

			alert("WebGL not supported");
			throw "cannot create webgl context";

		}

		_gl.clearColor(0, 0, 0, 1);
		_gl.clearDepth(1);

		_gl.enable(_gl.DEPTH_TEST);
		_gl.depthFunc(_gl.LEQUAL);

		_gl.frontFace(_gl.CCW);
		_gl.cullFace(_gl.BACK);
		_gl.enable(_gl.CULL_FACE);

		_gl.enable(_gl.BLEND);
		//_gl.blendFunc( _gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA );
		//_gl.blendFunc( _gl.SRC_ALPHA, _gl.ONE ); // cool!
		_gl.blendFunc(_gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);
		_gl.clearColor(0, 0, 0, 0);

		this._gl = _gl
	}

	generateFragmentShader(maxDirLights, maxPointLights) {
		const chunks = [

			"#ifdef GL_ES",
			"precision highp float;",
			"#endif",

			maxDirLights ? "#define MAX_DIR_LIGHTS " + maxDirLights : "",
			maxPointLights ? "#define MAX_POINT_LIGHTS " + maxPointLights : "",

			"uniform int material;", // 0 - Basic, 1 - Lambert, 2 - Phong, 3 - Depth, 4 - Normal

			"uniform bool enableMap;",

			"uniform sampler2D tMap;",
			"uniform vec4 mColor;",
			"uniform float mOpacity;",

			"uniform vec4 mAmbient;",
			"uniform vec4 mSpecular;",
			"uniform float mShininess;",

			"uniform float m2Near;",
			"uniform float mFarPlusNear;",
			"uniform float mFarMinusNear;",

			"uniform int pointLightNumber;",
			"uniform int directionalLightNumber;",

			maxDirLights ? "uniform mat4 viewMatrix;" : "",
			maxDirLights ? "uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];" : "",

			"varying vec3 vNormal;",
			"varying vec2 vUv;",

			"varying vec3 vLightWeighting;",

			maxPointLights ? "varying vec3 vPointLightVector[ MAX_POINT_LIGHTS ];" : "",

			"varying vec3 vViewPosition;",

			"void main() {",

			"vec4 mapColor = vec4( 1.0, 1.0, 1.0, 1.0 );",

			"if ( enableMap ) {",

			"mapColor = texture2D( tMap, vUv );",

			"}",

			// Normals

			"if ( material == 4 ) { ",

			"gl_FragColor = vec4( 0.5*normalize( vNormal ) + vec3(0.5, 0.5, 0.5), mOpacity );",

			// Depth

			"} else if ( material == 3 ) { ",

			// this breaks shader validation in Chrome 9.0.576.0 dev 
			// and also latest continuous build Chromium 9.0.583.0 (66089)
			// (curiously it works in Chrome 9.0.576.0 canary build and Firefox 4b7)
			//"float w = 1.0 - ( m2Near / ( mFarPlusNear - gl_FragCoord.z * mFarMinusNear ) );",
			"float w = 0.5;",

			"gl_FragColor = vec4( w, w, w, mOpacity );",

			// Blinn-Phong
			// based on o3d example

			"} else if ( material == 2 ) { ",

			"vec3 normal = normalize( vNormal );",
			"vec3 viewPosition = normalize( vViewPosition );",

			// point lights

			maxPointLights ? "vec4 pointDiffuse  = vec4( 0.0, 0.0, 0.0, 0.0 );" : "",
			maxPointLights ? "vec4 pointSpecular = vec4( 0.0, 0.0, 0.0, 0.0 );" : "",

			maxPointLights ? "for( int i = 0; i < MAX_POINT_LIGHTS; i++ ) {" : "",

			maxPointLights ? "vec3 pointVector = normalize( vPointLightVector[ i ] );" : "",
			maxPointLights ? "vec3 pointHalfVector = normalize( vPointLightVector[ i ] + vViewPosition );" : "",

			maxPointLights ? "float pointDotNormalHalf = dot( normal, pointHalfVector );" : "",
			maxPointLights ? "float pointDiffuseWeight = max( dot( normal, pointVector ), 0.0 );" : "",

			// Ternary conditional is from the original o3d shader. Here it produces abrupt dark cutoff artefacts.
			// Using just pow works ok in Chrome, but makes different artefact in Firefox 4.
			// Zeroing on negative pointDotNormalHalf seems to work in both.

			//"float specularCompPoint = dot( normal, pointVector ) < 0.0 || pointDotNormalHalf < 0.0 ? 0.0 : pow( pointDotNormalHalf, mShininess );",
			//"float specularCompPoint = pow( pointDotNormalHalf, mShininess );",
			//"float pointSpecularWeight = pointDotNormalHalf < 0.0 ? 0.0 : pow( pointDotNormalHalf, mShininess );",

			// Ternary conditional inside for loop breaks Chrome shader linking.
			// Must do it with if.

			maxPointLights ? "float pointSpecularWeight = 0.0;" : "",
			maxPointLights ? "if ( pointDotNormalHalf >= 0.0 )" : "",
			maxPointLights ? "pointSpecularWeight = pow( pointDotNormalHalf, mShininess );" : "",

			maxPointLights ? "pointDiffuse  += mColor * pointDiffuseWeight;" : "",
			maxPointLights ? "pointSpecular += mSpecular * pointSpecularWeight;" : "",

			maxPointLights ? "}" : "",

			// directional lights

			maxDirLights ? "vec4 dirDiffuse  = vec4( 0.0, 0.0, 0.0, 0.0 );" : "",
			maxDirLights ? "vec4 dirSpecular = vec4( 0.0, 0.0, 0.0, 0.0 );" : "",

			maxDirLights ? "for( int i = 0; i < MAX_DIR_LIGHTS; i++ ) {" : "",

			maxDirLights ? "vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );" : "",

			maxDirLights ? "vec3 dirVector = normalize( lDirection.xyz );" : "",
			maxDirLights ? "vec3 dirHalfVector = normalize( lDirection.xyz + vViewPosition );" : "",

			maxDirLights ? "float dirDotNormalHalf = dot( normal, dirHalfVector );" : "",

			maxDirLights ? "float dirDiffuseWeight = max( dot( normal, dirVector ), 0.0 );" : "",

			maxDirLights ? "float dirSpecularWeight = 0.0;" : "",
			maxDirLights ? "if ( dirDotNormalHalf >= 0.0 )" : "",
			maxDirLights ? "dirSpecularWeight = pow( dirDotNormalHalf, mShininess );" : "",

			maxDirLights ? "dirDiffuse  += mColor * dirDiffuseWeight;" : "",
			maxDirLights ? "dirSpecular += mSpecular * dirSpecularWeight;" : "",

			maxDirLights ? "}" : "",

			// all lights contribution summation

			"vec4 totalLight = mAmbient;",
			maxDirLights ? "totalLight += dirDiffuse + dirSpecular;" : "",
			maxPointLights ? "totalLight += pointDiffuse + pointSpecular;" : "",

			// looks nicer with weighting

			"gl_FragColor = vec4( mapColor.rgb * totalLight.xyz * vLightWeighting, mapColor.a );",

			// Lambert: diffuse lighting

			"} else if ( material == 1 ) {",

			"gl_FragColor = vec4( mColor.rgb * mapColor.rgb * vLightWeighting, mColor.a * mapColor.a );",

			// Basic: unlit color / texture

			"} else {",

			"gl_FragColor = mColor * mapColor;",

			"}",

			"}"];

		return chunks.join("\n");

	}

	generateVertexShader(maxDirLights, maxPointLights) {
		const chunks = [

			maxDirLights ? "#define MAX_DIR_LIGHTS " + maxDirLights : "",
			maxPointLights ? "#define MAX_POINT_LIGHTS " + maxPointLights : "",

			"attribute vec3 position;",
			"attribute vec3 normal;",
			"attribute vec2 uv;",

			"uniform vec3 cameraPosition;",

			"uniform bool enableLighting;",

			"uniform int pointLightNumber;",
			"uniform int directionalLightNumber;",

			"uniform vec3 ambientLightColor;",

			maxDirLights ? "uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];" : "",
			maxDirLights ? "uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];" : "",

			maxPointLights ? "uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];" : "",
			maxPointLights ? "uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];" : "",

			"uniform mat4 objMatrix;",
			"uniform mat4 viewMatrix;",
			"uniform mat4 modelViewMatrix;",
			"uniform mat4 projectionMatrix;",
			"uniform mat3 normalMatrix;",

			"varying vec3 vNormal;",
			"varying vec2 vUv;",

			"varying vec3 vLightWeighting;",

			maxPointLights ? "varying vec3 vPointLightVector[ MAX_POINT_LIGHTS ];" : "",

			"varying vec3 vViewPosition;",

			"varying vec3 vFragPosition;",

			"void main(void) {",

			// world space

			"vec4 mPosition = objMatrix * vec4( position, 1.0 );",
			"vViewPosition = cameraPosition - mPosition.xyz;",

			// eye space

			"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
			"vec3 transformedNormal = normalize( normalMatrix * normal );",

			"if ( !enableLighting ) {",

			"vLightWeighting = vec3( 1.0, 1.0, 1.0 );",

			"} else {",

			"vLightWeighting = ambientLightColor;",

			// directional lights

			maxDirLights ? "for( int i = 0; i < MAX_DIR_LIGHTS; i++ ) {" : "",
			maxDirLights ? "vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );" : "",
			maxDirLights ? "float directionalLightWeighting = max( dot( transformedNormal, normalize(lDirection.xyz ) ), 0.0 );" : "",
			maxDirLights ? "vLightWeighting += directionalLightColor[ i ] * directionalLightWeighting;" : "",
			maxDirLights ? "}" : "",

			// point lights

			maxPointLights ? "for( int i = 0; i < MAX_POINT_LIGHTS; i++ ) {" : "",
			maxPointLights ? "vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );" : "",
			maxPointLights ? "vPointLightVector[ i ] = normalize( lPosition.xyz - mvPosition.xyz );" : "",
			maxPointLights ? "float pointLightWeighting = max( dot( transformedNormal, vPointLightVector[ i ] ), 0.0 );" : "",
			maxPointLights ? "vLightWeighting += pointLightColor[ i ] * pointLightWeighting;" : "",
			maxPointLights ? "}" : "",

			"}",

			"vNormal = transformedNormal;",
			"vUv = uv;",

			"gl_Position = projectionMatrix * mvPosition;",

			"}"];

		return chunks.join("\n");
	}

	initProgram(maxDirLights, maxPointLights) {
		const _gl = this._gl

		const _program = _gl.createProgram();
		this._program = _program

		_gl.attachShader(_program, this.getShader("fragment", this.generateFragmentShader(maxDirLights, maxPointLights)));
		_gl.attachShader(_program, this.getShader("vertex", this.generateVertexShader(maxDirLights, maxPointLights)));

		_gl.linkProgram(_program);

		if (!_gl.getProgramParameter(_program, _gl.LINK_STATUS)) {

			alert("Could not initialise shaders");

			//alert( "VALIDATE_STATUS: " + _gl.getProgramParameter( _program, _gl.VALIDATE_STATUS ) );
			//alert( _gl.getError() );
		}


		_gl.useProgram(_program);

		// matrices

		_program.viewMatrix = _gl.getUniformLocation(_program, "viewMatrix");
		_program.modelViewMatrix = _gl.getUniformLocation(_program, "modelViewMatrix");
		_program.projectionMatrix = _gl.getUniformLocation(_program, "projectionMatrix");
		_program.normalMatrix = _gl.getUniformLocation(_program, "normalMatrix");
		_program.objMatrix = _gl.getUniformLocation(_program, "objMatrix");

		_program.cameraPosition = _gl.getUniformLocation(_program, 'cameraPosition');

		// lights

		_program.enableLighting = _gl.getUniformLocation(_program, 'enableLighting');

		_program.ambientLightColor = _gl.getUniformLocation(_program, 'ambientLightColor');

		if (maxDirLights) {

			_program.directionalLightNumber = _gl.getUniformLocation(_program, 'directionalLightNumber');
			_program.directionalLightColor = _gl.getUniformLocation(_program, 'directionalLightColor');
			_program.directionalLightDirection = _gl.getUniformLocation(_program, 'directionalLightDirection');

		}

		if (maxPointLights) {

			_program.pointLightNumber = _gl.getUniformLocation(_program, 'pointLightNumber');
			_program.pointLightColor = _gl.getUniformLocation(_program, 'pointLightColor');
			_program.pointLightPosition = _gl.getUniformLocation(_program, 'pointLightPosition');

		}

		// material

		_program.material = _gl.getUniformLocation(_program, 'material');

		// material properties (Basic / Lambert / Blinn-Phong shader)

		_program.mColor = _gl.getUniformLocation(_program, 'mColor');
		_program.mOpacity = _gl.getUniformLocation(_program, 'mOpacity');

		// material properties (Blinn-Phong shader)

		_program.mAmbient = _gl.getUniformLocation(_program, 'mAmbient');
		_program.mSpecular = _gl.getUniformLocation(_program, 'mSpecular');
		_program.mShininess = _gl.getUniformLocation(_program, 'mShininess');

		// texture (diffuse map)

		_program.enableMap = _gl.getUniformLocation(_program, "enableMap");
		_gl.uniform1i(_program.enableMap, 0);

		_program.tMap = _gl.getUniformLocation(_program, "tMap");
		_gl.uniform1i(_program.tMap, 0);

		// material properties (Depth)

		_program.m2Near = _gl.getUniformLocation(_program, 'm2Near');
		_program.mFarPlusNear = _gl.getUniformLocation(_program, 'mFarPlusNear');
		_program.mFarMinusNear = _gl.getUniformLocation(_program, 'mFarMinusNear');

		// vertex arrays

		_program.position = _gl.getAttribLocation(_program, "position");
		_gl.enableVertexAttribArray(_program.position);

		_program.normal = _gl.getAttribLocation(_program, "normal");
		_gl.enableVertexAttribArray(_program.normal);

		_program.uv = _gl.getAttribLocation(_program, "uv");
		_gl.enableVertexAttribArray(_program.uv);


		_program.viewMatrixArray = new Float32Array(16);
		_program.modelViewMatrixArray = new Float32Array(16);
		_program.projectionMatrixArray = new Float32Array(16);

	}

	getShader(type, string) {
		const _gl = this._gl

		let shader;

		if (type == "fragment") {

			shader = _gl.createShader(_gl.FRAGMENT_SHADER);

		} else if (type == "vertex") {

			shader = _gl.createShader(_gl.VERTEX_SHADER);

		}

		_gl.shaderSource(shader, string);
		_gl.compileShader(shader);

		if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {

			alert(_gl.getShaderInfoLog(shader));
			return null;

		}

		return shader;
	}
}