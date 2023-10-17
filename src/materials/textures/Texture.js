
const UVMapping = 0;
const ReflectionMap = 1;
const CubeMap = 2;

export default class Texture {

    constructor(image, mapping) {
        this.image = image;
        this.mapping = mapping ? mapping : UVMapping;
    }

    toString() {
        
		return 'THREE.Texture (<br/>' +
        'image: ' + this.image + '<br/>' +
        'mapping: ' + this.mapping + '<br/>' +
        ')';
    }
}