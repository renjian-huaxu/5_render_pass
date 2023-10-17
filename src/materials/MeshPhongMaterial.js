import Color from "../core/Color";
import { NormalBlending, PhongShading } from "./Material";

const MeshPhongMaterialCounter = { value: 0 };

export default class MeshPhongMaterial {

    constructor(parameters) {

        this.id = MeshPhongMaterialCounter.value ++;

        this.color = new Color( 0xeeeeee );
        this.map = null;
        this.ambient = new Color( 0x050505 );
        this.specular = new Color( 0x111111 );
        this.specular_map = null;
        this.shininess = 30;
        this.opacity = 1;
        this.shading = PhongShading;
        this.blending = NormalBlending;
        this.wireframe = false;
        this.wireframe_linewidth = 1;

        if ( parameters ) {

            if ( parameters.color !== undefined ) this.color = new Color( parameters.color );
            if ( parameters.map !== undefined ) this.map = parameters.map;
            if ( parameters.ambient !== undefined ) this.ambient = new Color( parameters.ambient );
            if ( parameters.specular !== undefined ) this.specular = new Color( parameters.specular );
            if ( parameters.specular_map !== undefined ) this.specular_map = parameters.specular_map;
            if ( parameters.shininess !== undefined ) this.shininess = parameters.shininess;
            if ( parameters.opacity !== undefined ) this.opacity = parameters.opacity;
            if ( parameters.shading !== undefined ) this.shading = parameters.shading;
            if ( parameters.blending !== undefined ) this.blending = parameters.blending;
            if ( parameters.wireframe !== undefined ) this.wireframe = parameters.wireframe;
            if ( parameters.wireframe_linewidth !== undefined ) this.wireframe_linewidth = parameters.wireframe_linewidth;
    
        }
    }

    toString() {

		return 'THREE.MeshPhongMaterial (<br/>' +
			'id: ' + this.id + '<br/>' +
			'color: ' + this.color + '<br/>' +
			'map: ' + this.map + '<br/>' +
			'ambient: ' + this.ambient + '<br/>' +
			'specular: ' + this.specular + '<br/>' +
			'specular_map: ' + this.specular_map + '<br/>' +
			'shininess: ' + this.shininess + '<br/>' +
			'alpha: ' + this.opacity + '<br/>' +
			'shading: ' + this.shading + '<br/>' +
			'wireframe: ' + this.wireframe + '<br/>' +
			'wireframe_linewidth: ' + this.wireframe_linewidth + '<br/>' +
			+ ')';
    }

}