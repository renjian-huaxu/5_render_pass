import Face3 from "../core/Face3";
import Object3D from "./Object3D";

export default class Mesh extends Object3D {

    constructor(geometry, materials, normUVs) {

        super()

        this.geometry = geometry;
        
        this.materials = materials 
                        ? materials instanceof Array ? materials : [materials]
                        : [];

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

        material.forEach(material => {
            if ( material== undefined ) {

				hash_array.push( "undefined" );

			} else {

				hash_array.push( material.toString() );

			}
        })

		return hash_array.join("_");
    }

    sortFacesByMaterial() {

        const hash_map = {};

        this.geometry.faces.forEach((face, index) => {
            const material = face.material;
    
            const mhash = this.materialHash( material );
    
            if ( hash_map[ mhash ] == undefined ) {
    
                hash_map[ mhash ] = { 'hash': mhash, 'counter': 0 };
    
            }
    
            let ghash = hash_map[ mhash ].hash + '_' + hash_map[ mhash ].counter;
            
            if ( this.materialFaceGroup[ ghash ] == undefined ) {
    
                this.materialFaceGroup[ ghash ] = { 'faces': [], 'material': material, 'vertices': 0 };
    
            }
    
            const vertices = face instanceof Face3 ? 3 : 4;

            if ( this.materialFaceGroup[ ghash ].vertices + vertices > 65535 ) {
    
                hash_map[ mhash ].counter += 1;
                ghash = hash_map[ mhash ].hash + '_' + hash_map[ mhash ].counter;
    
                if ( this.materialFaceGroup[ ghash ] == undefined ) {
    
                    this.materialFaceGroup[ ghash ] = { 'faces': [], 'material': material, 'vertices': 0 };
    
                }
    
            }
    
            this.materialFaceGroup[ ghash ].faces.push( index );
            this.materialFaceGroup[ ghash ].vertices += vertices;
        });

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