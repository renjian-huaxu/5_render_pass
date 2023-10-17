import Face3 from "../core/Face3";
import Object3D from "./Object3D";

export default class Mesh extends Object3D {

    constructor(geometry, material, normUVs) {
        super(material)

        this.geometry = geometry;
        material && (this.material = material instanceof Array ? material : [material]);

        this.flipSided = false;
        this.doubleSided = false;

        this.overdraw = false;

        this.materialFaceGroup = {};

        this.sortFacesByMaterial();
        if (normUVs) this.normalizeUVs();

        this.geometry.computeBoundingBox();
    }


    materialHash(material) {
		let hash_array = [];

		for ( let i = 0, l = material.length; i < l; i++ ) {

			if ( material[ i ] == undefined ) {

				hash_array.push( "undefined" );

			} else {

				hash_array.push( material[ i ].toString() );

			}

		}

		return hash_array.join("_");
    }

    sortFacesByMaterial() {
        var i, l, f, fl, face, material, vertices, mhash, ghash, hash_map = {};

        for ( f = 0, fl = this.geometry.faces.length; f < fl; f++ ) {
    
            face = this.geometry.faces[ f ];
            material = face.material;
    
            mhash = this.materialHash( material );
    
            if ( hash_map[ mhash ] == undefined ) {
    
                hash_map[ mhash ] = { 'hash': mhash, 'counter': 0 };
    
            }
    
            ghash = hash_map[ mhash ].hash + '_' + hash_map[ mhash ].counter;
    
            if ( this.materialFaceGroup[ ghash ] == undefined ) {
    
                this.materialFaceGroup[ ghash ] = { 'faces': [], 'material': material, 'vertices': 0 };
    
            }
    
            vertices = face instanceof Face3 ? 3 : 4;
    
            if ( this.materialFaceGroup[ ghash ].vertices + vertices > 65535 ) {
    
                hash_map[ mhash ].counter += 1;
                ghash = hash_map[ mhash ].hash + '_' + hash_map[ mhash ].counter;
    
                if ( this.materialFaceGroup[ ghash ] == undefined ) {
    
                    this.materialFaceGroup[ ghash ] = { 'faces': [], 'material': material, 'vertices': 0 };
    
                }
    
            }
    
            this.materialFaceGroup[ ghash ].faces.push( f );
            this.materialFaceGroup[ ghash ].vertices += vertices;
    
    
        }
       
    }

    normalizeUVs() {
        this.geometry.uvs.forEach(uvArr => {
            uvArr.forEach(uv => {
                if (uv.u != 1.0) uv.u = uv.u - Math.floor(uv.u);
                if (uv.v != 1.0) uv.v = uv.v - Math.floor(uv.v);
            })
        });

    }

}