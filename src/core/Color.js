
export default class Color {

    // __styleString = 'rgba(0, 0, 0, 1)'

    constructor(hex) {

        this.autoUpdate = true;
        this.setHex( hex );

    }

    setRGBA(r, g, b, a) {

        this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;

		if ( this.autoUpdate ) {

			this.updateHex();
			this.updateStyleString();

		}
    }

    setHex(hex) {
        
		this.hex = ( ( hex = ~~ hex ) & 0xffffff ) == hex ? 0xff << 24 ^ hex : hex;

		if ( this.autoUpdate ) {

			this.updateRGBA();
			this.updateStyleString();

		}

    }

    updateHex() {
        this.hex = ~~( this.a * 255 ) << 24 ^ ~~( this.r * 255 ) << 16 ^ ~~( this.g * 255 ) << 8 ^ ~~( this.b * 255 );
    }
    
    updateRGBA() {

        this.a = ( this.hex >> 24 & 255 ) / 255;
		this.r = ( this.hex >> 16 & 255 ) / 255;
		this.g = ( this.hex >> 8 & 255 ) / 255;
		this.b = ( this.hex & 255 ) / 255;
        
    }

    updateStyleString() {

        this.__styleString = 'rgba(' + ~~( this.r * 255 ) + ',' + ~~( this.g * 255 ) + ',' + ~~( this.b * 255 ) + ',' + this.a + ')';
   
    }

    toString() {

        return 'MTHREE.Color ( r: ' + this.r + ', g: ' + this.g + ', b: ' + this.b + ', a: ' + this.a + ', hex: ' + this.hex + ' )';
    
    }
} 